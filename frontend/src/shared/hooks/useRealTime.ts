import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useApi';

// Types for real-time events
export interface DatabaseEvent {
  type: 'database_created' | 'database_updated' | 'database_deleted';
  data: {
    id: string;
    name: string;
    timestamp: string;
  };
}

export interface QueryEvent {
  type: 'query_started' | 'query_completed' | 'query_failed';
  data: {
    id: string;
    query: string;
    databaseId: string;
    status: 'running' | 'completed' | 'failed';
    duration?: number;
    timestamp: string;
  };
}

export interface MetricsEvent {
  type: 'metrics_updated';
  data: {
    databaseId: string;
    metrics: {
      activeConnections: number;
      queryCount: number;
      avgResponseTime: number;
      memoryUsage: number;
    };
    timestamp: string;
  };
}

export type RealTimeEvent = DatabaseEvent | QueryEvent | MetricsEvent;

// Hook for managing Server-Sent Events connection
export function useServerSentEvents(url?: string, enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !url) return;

    const connectToEventSource = () => {
      try {
        setError(null);
        eventSourceRef.current = new EventSource(url, {
          withCredentials: true, // Include credentials for authentication
        });

        eventSourceRef.current.onopen = () => {
          console.log('SSE connection opened');
          setIsConnected(true);
          setError(null);
        };

        eventSourceRef.current.onmessage = (event) => {
          try {
            const eventData: RealTimeEvent = JSON.parse(event.data);
            setLastEvent(eventData);
            handleRealTimeEvent(eventData);
          } catch (err) {
            console.error('Failed to parse SSE event:', err);
          }
        };

        eventSourceRef.current.onerror = (event) => {
          console.error('SSE connection error:', event);
          setIsConnected(false);
          setError('Connection lost. Attempting to reconnect...');
          
          // Close the connection and attempt to reconnect after a delay
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
          
          setTimeout(() => {
            if (enabled) {
              connectToEventSource();
            }
          }, 5000); // Retry after 5 seconds
        };

      } catch (err) {
        console.error('Failed to create SSE connection:', err);
        setError('Failed to establish real-time connection');
      }
    };

    connectToEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [url, enabled]);

  const handleRealTimeEvent = (event: RealTimeEvent) => {
    switch (event.type) {
      case 'database_created':
      case 'database_updated':
      case 'database_deleted':
        // Invalidate databases list to refresh
        queryClient.invalidateQueries({ queryKey: queryKeys.databases });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        break;

      case 'query_started':
      case 'query_completed':
      case 'query_failed':
        // Invalidate query-related caches
        queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.queryExecutions(event.data.databaseId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        break;

      case 'metrics_updated':
        // Update specific database metrics
        const currentMetrics = queryClient.getQueryData(queryKeys.databaseMetrics(event.data.databaseId));
        if (currentMetrics) {
          queryClient.setQueryData(
            queryKeys.databaseMetrics(event.data.databaseId),
            {
              ...currentMetrics,
              performance: event.data.metrics,
              lastUpdated: event.data.timestamp,
            }
          );
        }
        break;

      default:
        console.log('Unknown event type:', event);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  const reconnect = () => {
    disconnect();
    if (url && enabled) {
      // Small delay before reconnecting
      setTimeout(() => {
        if (enabled) {
          const eventSource = new EventSource(url, { withCredentials: true });
          eventSourceRef.current = eventSource;
        }
      }, 1000);
    }
  };

  return {
    isConnected,
    lastEvent,
    error,
    disconnect,
    reconnect,
  };
}

// Hook for real-time dashboard updates
export function useRealTimeDashboard() {
  const sseUrl = '/api/events/dashboard'; // Adjust based on your API
  const sse = useServerSentEvents(sseUrl, true);
  
  // For demo purposes, simulate events when real SSE is not available
  useEffect(() => {
    if (!sse.isConnected) {
      const interval = setInterval(() => {
        // Simulate random events for development
        const events: RealTimeEvent[] = [
          {
            type: 'query_completed',
            data: {
              id: `query-${Date.now()}`,
              query: 'SELECT * FROM users LIMIT 100',
              databaseId: 'db-1',
              status: 'completed',
              duration: Math.floor(Math.random() * 1000) + 100,
              timestamp: new Date().toISOString(),
            },
          },
          {
            type: 'metrics_updated',
            data: {
              databaseId: 'db-1',
              metrics: {
                activeConnections: Math.floor(Math.random() * 20) + 5,
                queryCount: Math.floor(Math.random() * 100) + 50,
                avgResponseTime: Math.floor(Math.random() * 200) + 100,
                memoryUsage: Math.floor(Math.random() * 40) + 40,
              },
              timestamp: new Date().toISOString(),
            },
          },
        ];
        
        // Randomly pick an event to simulate
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        // Trigger a simulated event (this would normally come from SSE)
        console.log('Simulated event:', randomEvent);
      }, 15000); // Every 15 seconds

      return () => clearInterval(interval);
    }
  }, [sse.isConnected]);

  return sse;
}

// Hook for real-time query monitoring
export function useRealTimeQueryMonitoring(databaseId?: string) {
  const sseUrl = databaseId 
    ? `/api/events/database/${databaseId}/queries`
    : '/api/events/queries';
  
  return useServerSentEvents(sseUrl, true);
}

// Hook for real-time database metrics
export function useRealTimeDatabaseMetrics(databaseId: string) {
  const sseUrl = `/api/events/database/${databaseId}/metrics`;
  return useServerSentEvents(sseUrl, !!databaseId);
}

// Hook for connection status monitoring
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for managing real-time features across the app
export function useRealTimeManager() {
  const connectionStatus = useConnectionStatus();
  const dashboardEvents = useRealTimeDashboard();
  
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  
  useEffect(() => {
    // Disable real-time features when offline
    if (!connectionStatus) {
      setIsRealTimeEnabled(false);
    }
  }, [connectionStatus]);
  
  const enableRealTime = () => setIsRealTimeEnabled(true);
  const disableRealTime = () => setIsRealTimeEnabled(false);
  
  return {
    isOnline: connectionStatus,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
    dashboardEvents,
    connectionError: dashboardEvents.error,
  };
}