import { useEffect, useCallback } from 'react';
import { useSSE } from './useSSE';
import { useNotificationStore } from '@/app/stores/notifications';

/**
 * Hook for integrating SSE events with the notification system.
 * Automatically creates notifications based on backend events.
 */
export function useSSENotifications() {
  const { addNotification } = useNotificationStore();

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
        
        // Convert SSE events to user notifications
        switch (data.event_type) {
          case 'completed':
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
            addNotification({
              title: 'Query Timeout',
              message: 'Your query took too long to execute and was cancelled.',
              type: 'warning',
              actionUrl: '/queries',
              actionLabel: 'Try Again',
            });
            break;

          case 'failed':
            addNotification({
              title: 'Query Failed',
              message: data.error || 'An error occurred while executing your query.',
              type: 'error',
              actionUrl: '/queries',
              actionLabel: 'Try Again',
            });
            break;

          case 'database_created':
            addNotification({
              title: 'Database Created',
              message: `New database ${data.database_name || 'database'} has been successfully created.`,
              type: 'success',
              actionUrl: `/databases/${data.database_id}`,
              actionLabel: 'View Database',
            });
            break;

          case 'database_deleted':
            addNotification({
              title: 'Database Deleted',
              message: `Database ${data.database_name || 'database'} has been successfully deleted.`,
              type: 'info',
              actionUrl: '/databases',
              actionLabel: 'View Databases',
            });
            break;

          case 'backup_complete':
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
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected };
}