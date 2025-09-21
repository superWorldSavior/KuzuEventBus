import { useCallback } from 'react';
import { useNotifications } from './useNotifications';
import { createErrorNotification, getUserFriendlyError, type ApiErrorDetails } from '@/shared/lib/errorHandling';

/**
 * Hook for handling API errors with user-friendly notifications
 * Automatically creates appropriate toast notifications based on error type
 */
export function useApiErrorHandler() {
  const { addNotification } = useNotifications();

  const handleError = useCallback((error: any, context?: string) => {
    console.error('API Error:', error, context ? `Context: ${context}` : '');
    
    const notification = createErrorNotification(error);
    
    // Add context to title if provided
    if (context && !notification.title.includes(context)) {
      notification.title = `${context}: ${notification.title}`;
    }
    
    addNotification({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      // Convert duration to appropriate action format if needed
      actionUrl: notification.actions?.[0] ? undefined : undefined,
      actionLabel: notification.actions?.[0]?.label,
    });
  }, [addNotification]);

  const handleSuccess = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'success',
      title: title || 'Success',
      message,
    });
  }, [addNotification]);

  const handleInfo = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'info',
      title: title || 'Information',
      message,
    });
  }, [addNotification]);

  const handleWarning = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'warning',
      title: title || 'Warning',
      message,
    });
  }, [addNotification]);

  return {
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
    getUserFriendlyError,
  };
}

/**
 * Higher-order hook that wraps async functions with automatic error handling
 * Usage: const safeCreateDatabase = useApiErrorHandler().withErrorHandling(apiService.createDatabase, 'Creating Database');
 */
export function useApiWithErrorHandling() {
  const { handleError, handleSuccess } = useApiErrorHandler();

  const withErrorHandling = useCallback(<T extends (...args: any[]) => Promise<any>>(
    asyncFn: T,
    context: string,
    successMessage?: string
  ) => {
    return (async (...args: Parameters<T>) => {
      try {
        const result = await asyncFn(...args);
        
        if (successMessage) {
          handleSuccess(successMessage, context);
        }
        
        return result;
      } catch (error) {
        handleError(error, context);
        throw error; // Re-throw to allow caller to handle if needed
      }
    }) as T;
  }, [handleError, handleSuccess]);

  return {
    withErrorHandling,
    ...useApiErrorHandler(),
  };
}

/**
 * Hook specifically for handling endpoint status and providing development information
 */
export function useEndpointStatus() {
  const { handleInfo, handleWarning } = useApiErrorHandler();

  const notifyEndpointStatus = useCallback((endpoint: string, isUsingMockData: boolean) => {
    if (isUsingMockData) {
      handleInfo(
        `This feature is using simulated data while the backend endpoint is being developed. The UI is fully functional for testing.`,
        `Development Mode: ${endpoint}`
      );
    }
  }, [handleInfo, handleWarning]);

  const notifyBackendUnavailable = useCallback((endpoint: string) => {
    handleWarning(
      `Cannot connect to the backend server. Using mock data for development. Please check if the backend server is running.`,
      `Backend Connection Issue: ${endpoint}`
    );
  }, [handleWarning]);

  return {
    notifyEndpointStatus,
    notifyBackendUnavailable,
  };
}

/**
 * Utility to determine if an error is safe to ignore (e.g., expected mock data usage)
 */
export function shouldIgnoreError(error: any): boolean {
  const details = error?.details as ApiErrorDetails;
  
  if (!details) return false;
  
  // Ignore "not implemented" errors when mock data is available
  return details.type === 'not_implemented' && details.hasMockData;
}

/**
 * Utility to check if we're in development mode with mock data
 */
export function isUsingMockData(error: any): boolean {
  const details = error?.details as ApiErrorDetails;
  return details?.hasMockData ?? false;
}