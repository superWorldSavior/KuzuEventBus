import { useState, useCallback } from 'react';
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
  const [connectionError] = useState<string | null>(null);

  // Use the shared SSE connection from useSSENotifications
  const { isConnected: notificationsConnected } = useSSENotifications();

  // We don't create our own SSE connection anymore - we rely on useSSENotifications
  const dashboardEvents = {
    isConnected: notificationsConnected,
    connect: () => {}, // No-op - connection managed by useSSENotifications
    disconnect: () => {}, // No-op 
    reconnect: () => {}, // No-op
  };

  const enableRealTime = useCallback(() => {
    setIsRealTimeEnabled(true);
  }, []);

  const disableRealTime = useCallback(() => {
    setIsRealTimeEnabled(false);
  }, []);

  return {
    isOnline: navigator.onLine,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
    dashboardEvents,
    connectionError,
  };
}