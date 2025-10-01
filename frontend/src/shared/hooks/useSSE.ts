import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { apiClient } from '@/shared/api/client';

interface SSEOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  onOpen?: (event: Event) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
}


interface SSEState<T = any> {
  data: T | null;
  error: Error | null;
  readyState: EventSource['readyState'];
  isConnecting: boolean;
  isConnected: boolean;
  reconnectCount: number;
}

// Module-scoped caches to avoid duplicate token minting across multiple hook instances
let GLOBAL_SSE_TOKEN: string | null = null;
let GLOBAL_SSE_TOKEN_EXP_MS = 0;
let GLOBAL_SSE_MINT_PROMISE: Promise<string> | null = null;
const GLOBAL_SOURCES: Record<string, { es: EventSource; refCount: number }> = {};

export function useSSE<T = any>(options: SSEOptions) {
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const currentUrlKeyRef = useRef<string | null>(null);
  const handlersRef = useRef<{ open?: (e: Event)=>void; message?: (e: MessageEvent)=>void; error?: (e: Event)=>void }>({});
  const isMountedRef = useRef(true);

  const [state, _setState] = useState<SSEState<T>>({
    data: null,
    error: null,
    readyState: EventSource.CLOSED,
    isConnecting: false,
    isConnected: false,
    reconnectCount: 0,
  });

  // Safe setState that ignores updates after unmount
  const setState = useCallback((updater: (prev: SSEState<T>) => SSEState<T>) => {
    if (!isMountedRef.current) return;
    _setState(updater);
  }, []);

  const {
    url,
    reconnectInterval = 5000,
    maxReconnectAttempts = 3,
    withCredentials = true,
    onOpen,
    onError,
    onMessage,
  } = options;

  // Cache a short-lived SSE JWT (minted server-side) globally to prevent spamming
  const getValidSseToken = useCallback(async (): Promise<string> => {
    const now = Date.now();
    // Still valid? reuse
    if (GLOBAL_SSE_TOKEN && now < (GLOBAL_SSE_TOKEN_EXP_MS - 60_000)) {
      return GLOBAL_SSE_TOKEN;
    }

    // If a mint is already in-flight, await it
    if (GLOBAL_SSE_MINT_PROMISE) return GLOBAL_SSE_MINT_PROMISE;

    GLOBAL_SSE_MINT_PROMISE = (async () => {
      try {
        const resp = await apiClient.post('/api/v1/auth/sse-token');
        const { token: sseToken, expires_in } = resp.data as { token: string; expires_in: number };
        GLOBAL_SSE_TOKEN = sseToken;
        GLOBAL_SSE_TOKEN_EXP_MS = Date.now() + expires_in * 1000;
        return sseToken;
      } finally {
        // release lock slightly later to prevent stampede
        setTimeout(() => { GLOBAL_SSE_MINT_PROMISE = null; }, 50);
      }
    })();

    return GLOBAL_SSE_MINT_PROMISE;
  }, []);

  const connect = useCallback(async () => {
    // Don't connect if already connecting or connected
    if (eventSourceRef.current?.readyState === EventSource.CONNECTING ||
        eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const baseUrl = new URL(url, window.location.origin);
      const sseJwt = await getValidSseToken();
      baseUrl.searchParams.set('token', sseJwt);
      const fullUrl = baseUrl.toString();

      // Reuse existing global EventSource for this URL if present
      const urlKey = fullUrl.split('?')[0];
      let source = GLOBAL_SOURCES[urlKey];
      if (!source || source.es.readyState === EventSource.CLOSED) {
        source = GLOBAL_SOURCES[urlKey] = {
          es: new EventSource(fullUrl, { withCredentials }),
          refCount: 0,
        };
      }

      // Per-instance handlers via addEventListener
      const es = source.es;

      const handleOpen = (event: Event) => {
        console.log('SSE connection opened:', urlKey);
        reconnectCountRef.current = 0;
        setState(prev => ({
          ...prev,
          readyState: EventSource.OPEN,
          isConnecting: false,
          isConnected: true,
          reconnectCount: 0,
          error: null,
        }));
        onOpen?.(event);
      };

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setState(prev => ({ ...prev, data }));
        } catch {
          setState(prev => ({ ...prev, data: event.data as any }));
        }
        onMessage?.(event);
      };

      const handleError = (event: Event) => {
        // Avoid tight loops: incremental backoff based on reconnectCount
        const error = new Error('SSE connection failed');
        setState(prev => ({
          ...prev,
          readyState: es.readyState,
          isConnecting: false,
          isConnected: false,
          error,
        }));
        onError?.(event);

        if (es.readyState === EventSource.CLOSED && reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current++;
          const backoff = Math.min(30000, reconnectInterval * reconnectCountRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, reconnectCount: reconnectCountRef.current }));
            connect();
          }, backoff);
        }
      };

      es.addEventListener('open', handleOpen);
      es.addEventListener('message', handleMessage);
      // Also subscribe to named events emitted by the server (backend contract)
      const namedEvents = ['completed', 'failed', 'timeout'];
      namedEvents.forEach((evt) => es.addEventListener(evt, handleMessage as any));
      es.addEventListener('error', handleError);

      source.refCount += 1;
      eventSourceRef.current = es;
      currentUrlKeyRef.current = urlKey;
      handlersRef.current = { open: handleOpen, message: handleMessage, error: handleError };
      // Keep the list of named events on the ref for cleanup
      (handlersRef.current as any).namedEvents = ['completed', 'failed', 'timeout'];

      // No return here; cleanup is centrally handled in disconnect()

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to create SSE connection'),
        isConnecting: false,
        isConnected: false,
      }));
    }
  }, [getValidSseToken, withCredentials, onOpen, onMessage, onError, reconnectInterval, maxReconnectAttempts, url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const es = eventSourceRef.current;
    const urlKey = currentUrlKeyRef.current;
    const handlers = handlersRef.current;
    if (es && urlKey) {
      try {
        if (handlers.open) es.removeEventListener('open', handlers.open);
        if (handlers.message) es.removeEventListener('message', handlers.message as any);
        // Remove named event listeners if any were attached
        const named = (handlers as any).namedEvents as string[] | undefined;
        if (named && handlers.message) {
          named.forEach((evt) => {
            try { es.removeEventListener(evt, handlers.message as any); } catch {}
          });
        }
        if (handlers.error) es.removeEventListener('error', handlers.error);
      } catch {}
      const entry = GLOBAL_SOURCES[urlKey];
      if (entry) {
        entry.refCount = Math.max(0, entry.refCount - 1);
        if (entry.refCount === 0) {
          try { entry.es.close(); } catch {}
          delete GLOBAL_SOURCES[urlKey];
        }
      }
      eventSourceRef.current = null;
      currentUrlKeyRef.current = null;
      handlersRef.current = {};
    }

    setState(prev => ({
      ...prev,
      readyState: EventSource.CLOSED,
      isConnecting: false,
      isConnected: false,
    }));
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    setTimeout(connect, 100); // Small delay to ensure cleanup
  }, [disconnect, connect]);

  // Auto-connect on mount and token changes
  useEffect(() => {
    isMountedRef.current = true;
    if (token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [token, connect, disconnect]);

  // Vite HMR: ensure we cleanup the global source on dispose to prevent duplicate handlers
  useEffect(() => {
    try {
      const meta: any = (import.meta as any);
      if (typeof meta !== 'undefined' && meta && meta.hot && typeof meta.hot.dispose === 'function') {
        meta.hot.dispose(() => { try { disconnect(); } catch {} });
      }
    } catch {}
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
  } as const;
}

// Specialized hook for dashboard real-time updates
export function useDashboardSSE() {
  return useSSE<{
    type: 'dashboard_update' | 'query_status' | 'activity_update';
    payload: any;
  }>({
    url: '/api/v1/dashboard/events',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });
}

// Specialized hook for query execution updates
export function useQuerySSE(queryId?: string) {
  return useSSE<{
    type: 'query_progress' | 'query_complete' | 'query_error';
    queryId: string;
    payload: any;
  }>({
    url: queryId ? `/api/v1/queries/${queryId}/events` : '/api/v1/queries/events',
    reconnectInterval: 1000,
    maxReconnectAttempts: 3,
  });
}

// Hook for database events
export function useDatabaseSSE(databaseId?: string) {
  return useSSE<{
    type: 'database_update' | 'schema_change' | 'backup_complete';
    databaseId: string;
    payload: any;
  }>({
    url: databaseId ? `/api/v1/databases/${databaseId}/events` : '/api/v1/databases/events',
    reconnectInterval: 10000,
    maxReconnectAttempts: 5,
  });
}