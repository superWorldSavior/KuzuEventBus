import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useApi';
import { useSSE } from './useSSE';
import { useSSENotifications } from './useSSENotifications';

// Types for real-time events (mapped from backend events)
export interface RealTimeEvent {
  event_type: 'completed' | 'timeout' | 'failed' | 'database_created' | 'database_deleted' | 'backup_complete';
  transaction_id?: string;
  database_id?: string;
  database_name?: string;
  query?: string;
  error?: string;
  execution_time_ms?: string;
  rows_count?: string;
  [key: string]: any;
}

// Hook for managing real-time dashboard updates
export function useRealTimeManager() {
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Initialize SSE notifications (always active when authenticated)
  const { isConnected: notificationsConnected } = useSSENotifications();

  // Dashboard events SSE connection
  const dashboardEvents = useSSE<RealTimeEvent>({
    url: '/api/v1/events/stream',
    onMessage: useCallback((event: MessageEvent) => {
      try {
        const data: RealTimeEvent = JSON.parse(event.data);
        handleRealTimeEvent(data);
      } catch (error) {
        console.warn('Failed to parse real-time event:', error);
      }
    }, []),
    onError: useCallback(() => {
      setConnectionError('Real-time connection lost. Attempting to reconnect...');
    }, []),
    onOpen: useCallback(() => {
      setConnectionError(null);
    }, []),
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  // Handle real-time events and invalidate relevant queries
  const handleRealTimeEvent = useCallback((event: RealTimeEvent) => {
    if (!isRealTimeEnabled) return;

    switch (event.event_type) {
      case 'completed':
      case 'timeout':
      case 'failed':
        // Invalidate query-related data
        queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
        break;

      case 'database_created':
      case 'database_deleted':
        // Invalidate database-related data
        queryClient.invalidateQueries({ queryKey: queryKeys.databases });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        if (event.database_id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.database(event.database_id) });
        }
        break;

      case 'backup_complete':
        // Invalidate database stats and activity
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
        if (event.database_id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.database(event.database_id) });
        }
        break;

      default:
        // Handle unknown events by refreshing dashboard
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        break;
    }
  }, [isRealTimeEnabled, queryClient]);

  // Auto-connect when enabled
  useEffect(() => {
    if (isRealTimeEnabled) {
      dashboardEvents.connect();
    } else {
      dashboardEvents.disconnect();
    }
  }, [isRealTimeEnabled, dashboardEvents]);

  const enableRealTime = useCallback(() => {
    setIsRealTimeEnabled(true);
  }, []);

  const disableRealTime = useCallback(() => {
    setIsRealTimeEnabled(false);
  }, []);

  // Suppress unused variable warning - used for monitoring connection status
  void notificationsConnected;

  return {
    isOnline: navigator.onLine,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
    dashboardEvents,
    connectionError,
  };
}