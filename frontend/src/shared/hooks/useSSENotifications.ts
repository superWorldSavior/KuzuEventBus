import { useEffect, useCallback } from 'react';
import { useSSE } from './useSSE';
import { useNotificationStore } from '@/app/stores/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/useApi';

/**
 * Hook for integrating SSE events with the notification system.
 * Automatically creates notifications based on backend events.
 */
export function useSSENotifications() {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  
  // Only connect if user has an API key (is authenticated)
  const apiKey = localStorage.getItem('kuzu_api_key');
  if (!apiKey || !apiKey.startsWith('kb_')) {
    return { isConnected: false as boolean };
  }

  const { connect, disconnect, isConnected } = useSSE<{
    event_type: 'completed' | 'timeout' | 'failed' | 'database_created' | 'database_deleted' | 'backup_complete';
    transaction_id?: string;
    database_id?: string;
    database_name?: string;
    query?: string;
    error?: string;
    execution_time_ms?: string;
    rows_count?: string;
    [key: string]: any;
  }>({
    url: '/api/v1/events/stream',
    onMessage: useCallback((event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Dispatch a DOM event for lightweight cross-component communication
        // Components (e.g., QueryExecutor) can subscribe without opening SSE
        const type = data?.event_type as string | undefined;
        if (type) {
          window.dispatchEvent(new CustomEvent('sse:event', { detail: data }));
        }
        
        // Convert SSE events to user notifications
        switch (data.event_type) {
          case 'completed':
            // Invalidate relevant caches
            queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
            queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
            if (data.database_id) {
              queryClient.invalidateQueries({ queryKey: queryKeys.database(data.database_id) });
              queryClient.invalidateQueries({ queryKey: queryKeys.databaseMetrics(data.database_id) });
            }
            addNotification({
              title: 'Query Completed',
              message: `Query executed successfully in ${
                data.execution_time_ms ? `${parseInt(data.execution_time_ms, 10)}ms` : 'unknown time'
              }. ${data.rows_count ? `${data.rows_count} rows returned.` : ''}`,
              type: 'success',
              actionUrl: `/queries/${data.transaction_id}`,
              actionLabel: 'View Results',
            });
            break;

          case 'timeout':
            queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
            queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
            addNotification({
              title: 'Query Timeout',
              message: 'Your query took too long to execute and was cancelled.',
              type: 'warning',
              actionUrl: '/queries',
              actionLabel: 'Try Again',
            });
            break;

          case 'failed':
            queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
            queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
            addNotification({
              title: 'Query Failed',
              message: data.error || 'An error occurred while executing your query.',
              type: 'error',
              actionUrl: '/queries',
              actionLabel: 'Try Again',
            });
            break;

          case 'database_created':
            queryClient.invalidateQueries({ queryKey: queryKeys.databases });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
            addNotification({
              title: 'Database Created',
              message: `New database ${data.database_name || 'database'} has been successfully created.`,
              type: 'success',
              actionUrl: `/databases/${data.database_id}`,
              actionLabel: 'View Database',
            });
            break;

          case 'database_deleted':
            queryClient.invalidateQueries({ queryKey: queryKeys.databases });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
            addNotification({
              title: 'Database Deleted',
              message: `Database ${data.database_name || 'database'} has been successfully deleted.`,
              type: 'info',
              actionUrl: '/databases',
              actionLabel: 'View Databases',
            });
            break;

          case 'backup_complete':
            if (data.database_id) {
              queryClient.invalidateQueries({ queryKey: queryKeys.databaseMetrics(data.database_id) });
            }
            addNotification({
              title: 'Backup Complete',
              message: `Database backup for ${data.database_name || 'database'} completed successfully.`,
              type: 'success',
              actionUrl: `/databases/${data.database_id}`,
              actionLabel: 'View Database',
            });
            break;

          default:
            // Handle generic events
            if (data.event_type && data.event_type !== 'notification') {
              addNotification({
                title: 'System Event',
                message: `Event: ${data.event_type}`,
                type: 'info',
              });
            }
            break;
        }
      } catch (error) {
        console.warn('Failed to parse SSE notification event:', error);
      }
    }, [addNotification]),
    reconnectInterval: 10000,
    maxReconnectAttempts: 3,
  });

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected };
}