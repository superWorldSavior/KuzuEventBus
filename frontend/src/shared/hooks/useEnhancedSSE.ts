import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface EnhancedSSEOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  backoffMultiplier?: number;
  maxBackoffInterval?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  enabled?: boolean;
  onOpen?: (event: Event) => void;
  onError?: (event: Event, reconnectCount: number) => void;
  onMessage?: (event: MessageEvent) => void;
  onReconnect?: (reconnectCount: number) => void;
  onMaxRetriesReached?: () => void;
}

interface SSEConnectionState<T = any> {
  data: T | null;
  error: Error | null;
  readyState: EventSource['readyState'];
  isConnecting: boolean;
  isConnected: boolean;
  reconnectCount: number;
  lastConnectedAt: Date | null;
  connectionDuration: number;
  totalReconnects: number;
  hasReachedMaxRetries: boolean;
}

interface EventBuffer {
  event: MessageEvent;
  timestamp: Date;
}

export function useEnhancedSSE<T = any>(options: EnhancedSSEOptions) {
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<Date | null>(null);
  const eventBufferRef = useRef<EventBuffer[]>([]);
  const reconnectCountRef = useRef(0);

  const [state, setState] = useState<SSEConnectionState<T>>({
    data: null,
    error: null,
    readyState: EventSource.CLOSED,
    isConnecting: false,
    isConnected: false,
    reconnectCount: 0,
    lastConnectedAt: null,
    connectionDuration: 0,
    totalReconnects: 0,
    hasReachedMaxRetries: false,
  });

  const {
    url,
    reconnectInterval = 1000, // Start with 1 second
    maxReconnectAttempts = 10,
    backoffMultiplier = 1.5,
    maxBackoffInterval = 30000, // Max 30 seconds
    withCredentials = true,
    enabled = true,
    onOpen,
    onError,
    onMessage,
    onReconnect,
    onMaxRetriesReached,
  } = options;

  // Calculate exponential backoff delay
  const calculateBackoffDelay = useCallback((attemptCount: number) => {
    const baseDelay = reconnectInterval;
    const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attemptCount);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, maxBackoffInterval);
  }, [reconnectInterval, backoffMultiplier, maxBackoffInterval]);

  // Build URL with auth token if available
  const buildUrl = useCallback(() => {
    if (!enabled) return '';
    
    const urlObj = new URL(url, window.location.origin);
    
    // Add auth token as query parameter if available
    if (token) {
      urlObj.searchParams.set('token', token);
    }
    
    return urlObj.toString();
  }, [url, token, enabled]);

  // Process buffered events when connection is restored
  const processBufferedEvents = useCallback(() => {
    if (eventBufferRef.current.length > 0) {
      console.log(`Processing ${eventBufferRef.current.length} buffered events`);
      
      eventBufferRef.current.forEach(({ event }) => {
        onMessage?.(event);
      });
      
      eventBufferRef.current = [];
    }
  }, [onMessage]);

  // Connect to EventSource
  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    const eventSourceUrl = buildUrl();
    if (!eventSourceUrl) return;

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      connectionStartTimeRef.current = new Date();
      
      // Create EventSource with headers if supported
      const eventSource = new EventSource(eventSourceUrl, {
        withCredentials,
      });

      eventSourceRef.current = eventSource;

      // Handle connection open
      eventSource.onopen = (event) => {
        const now = new Date();
        console.log('SSE connection established:', {
          url: eventSourceUrl,
          timestamp: now.toISOString(),
          reconnectCount: reconnectCountRef.current,
        });

        setState(prev => ({
          ...prev,
          isConnecting: false,
          isConnected: true,
          readyState: eventSource.readyState,
          error: null,
          lastConnectedAt: now,
          hasReachedMaxRetries: false,
        }));

        // Reset reconnect count on successful connection
        if (reconnectCountRef.current > 0) {
          onReconnect?.(reconnectCountRef.current);
          reconnectCountRef.current = 0;
        }

        // Process any buffered events
        processBufferedEvents();

        onOpen?.(event);
      };

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        let parsedData: T;
        
        try {
          parsedData = JSON.parse(event.data);
        } catch (parseError) {
          parsedData = event.data as T;
        }

        setState(prev => ({
          ...prev,
          data: parsedData,
          connectionDuration: prev.lastConnectedAt 
            ? Date.now() - prev.lastConnectedAt.getTime()
            : 0,
        }));

        onMessage?.(event);
      };

      // Handle connection errors
      eventSource.onerror = (event) => {
        const error = new Error(`SSE connection error (attempt ${reconnectCountRef.current + 1})`);
        
        console.error('SSE connection error:', {
          readyState: eventSource.readyState,
          reconnectCount: reconnectCountRef.current,
          maxAttempts: maxReconnectAttempts,
        });

        setState(prev => ({
          ...prev,
          error,
          readyState: eventSource.readyState,
          isConnected: false,
          isConnecting: false,
        }));

        onError?.(event, reconnectCountRef.current);

        // Attempt reconnection if not at max attempts
        if (reconnectCountRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          setState(prev => ({
            ...prev,
            hasReachedMaxRetries: true,
          }));
          onMaxRetriesReached?.();
        }
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setState(prev => ({
        ...prev,
        error: error as Error,
        isConnecting: false,
        isConnected: false,
      }));
    }
  }, [
    enabled,
    buildUrl,
    withCredentials,
    onOpen,
    onMessage,
    onError,
    onReconnect,
    onMaxRetriesReached,
    maxReconnectAttempts,
    processBufferedEvents,
  ]);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!enabled || reconnectCountRef.current >= maxReconnectAttempts) return;

    const delay = calculateBackoffDelay(reconnectCountRef.current);
    
    console.log(`Scheduling SSE reconnect in ${Math.round(delay)}ms (attempt ${reconnectCountRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCountRef.current++;
      
      setState(prev => ({
        ...prev,
        reconnectCount: reconnectCountRef.current,
        totalReconnects: prev.totalReconnects + 1,
      }));

      // Close existing connection before reconnecting
      disconnect();
      connect();
    }, delay);
  }, [enabled, maxReconnectAttempts, calculateBackoffDelay, connect]);

  // Disconnect from EventSource
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      console.log('Closing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      readyState: EventSource.CLOSED,
    }));
  }, []);

  // Manual reconnect (resets retry count)
  const reconnect = useCallback(() => {
    console.log('Manual SSE reconnect triggered');
    
    reconnectCountRef.current = 0;
    setState(prev => ({
      ...prev,
      reconnectCount: 0,
      hasReachedMaxRetries: false,
      error: null,
    }));
    
    disconnect();
    setTimeout(connect, 100); // Small delay before reconnecting
  }, [disconnect, connect]);

  // Buffer events when disconnected (optional for development)
  const bufferEvent = useCallback((event: MessageEvent) => {
    if (!state.isConnected && process.env.NODE_ENV === 'development') {
      eventBufferRef.current.push({
        event,
        timestamp: new Date(),
      });

      // Keep only last 10 events to prevent memory bloat
      if (eventBufferRef.current.length > 10) {
        eventBufferRef.current = eventBufferRef.current.slice(-10);
      }
    }
  }, [state.isConnected]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Connection health monitoring
  useEffect(() => {
    if (!state.isConnected) return;

    const healthCheckInterval = setInterval(() => {
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        console.warn('SSE connection lost, attempting reconnection...');
        scheduleReconnect();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(healthCheckInterval);
  }, [state.isConnected, scheduleReconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
    bufferEvent,
    canReconnect: !state.hasReachedMaxRetries,
    nextReconnectDelay: calculateBackoffDelay(reconnectCountRef.current),
  };
}

// Simplified hook for basic SSE usage
export function useServerSentEvents(url: string, enabled = true) {
  return useEnhancedSSE({
    url,
    enabled,
    maxReconnectAttempts: 5,
    onError: (_, reconnectCount) => {
      console.warn(`SSE connection error (attempt ${reconnectCount + 1})`);
    },
    onReconnect: (reconnectCount) => {
      console.log(`SSE reconnected after ${reconnectCount} attempts`);
    },
    onMaxRetriesReached: () => {
      console.error('SSE maximum reconnection attempts reached');
    },
  });
}