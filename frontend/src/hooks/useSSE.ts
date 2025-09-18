import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

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

export function useSSE<T = any>(options: SSEOptions) {
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const [state, setState] = useState<SSEState<T>>({
    data: null,
    error: null,
    readyState: EventSource.CLOSED,
    isConnecting: false,
    isConnected: false,
    reconnectCount: 0,
  });

  const {
    url,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    withCredentials = true,
    onOpen,
    onError,
    onMessage,
  } = options;

  // Build URL with auth token if available
  const buildUrl = useCallback(() => {
    const urlObj = new URL(url, window.location.origin);
    if (token) {
      urlObj.searchParams.set('token', token);
    }
    return urlObj.toString();
  }, [url, token]);

  const connect = useCallback(() => {
    // Don't connect if already connecting or connected
    if (eventSourceRef.current?.readyState === EventSource.CONNECTING ||
        eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const eventSource = new EventSource(buildUrl(), {
        withCredentials,
      });

      eventSource.onopen = (event) => {
        console.log('SSE connection opened:', url);
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

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState(prev => ({ ...prev, data }));
          onMessage?.(event);
        } catch (parseError) {
          console.warn('Failed to parse SSE message:', event.data);
          setState(prev => ({ ...prev, data: event.data }));
          onMessage?.(event);
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        const error = new Error('SSE connection failed');
        
        setState(prev => ({
          ...prev,
          readyState: eventSource.readyState,
          isConnecting: false,
          isConnected: false,
          error,
        }));

        onError?.(event);

        // Attempt reconnection if not manually closed
        if (eventSource.readyState === EventSource.CLOSED && 
            reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current++;
          
          console.log(`Attempting to reconnect SSE (${reconnectCountRef.current}/${maxReconnectAttempts}) in ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ 
              ...prev, 
              reconnectCount: reconnectCountRef.current 
            }));
            connect();
          }, reconnectInterval);
        } else if (reconnectCountRef.current >= maxReconnectAttempts) {
          console.error('Max SSE reconnection attempts reached');
          setState(prev => ({
            ...prev,
            error: new Error('Max reconnection attempts reached'),
          }));
        }
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to create SSE connection'),
        isConnecting: false,
        isConnected: false,
      }));
    }
  }, [buildUrl, withCredentials, onOpen, onMessage, onError, reconnectInterval, maxReconnectAttempts, url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
    if (token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

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