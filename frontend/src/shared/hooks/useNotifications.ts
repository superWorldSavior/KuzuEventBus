import { useEffect } from "react";
import { useNotificationStore, mockNotifications } from "../../app/stores/notifications";

/**
 * Hook to initialize mock notifications for development
 * This would be replaced with real notification fetching in production
 */
export function useNotificationInit() {
  const { addNotification, notifications } = useNotificationStore();

  useEffect(() => {
    // Only add mock notifications if none exist (first time loading)
    if (notifications.length === 0) {
      // Add mock notifications with some delay to simulate real-time arrival
      mockNotifications.forEach((notification, index) => {
        setTimeout(() => {
          addNotification(notification);
        }, index * 1000); // Stagger by 1 second each
      });
    }
  }, [addNotification, notifications.length]);
}

/**
 * Hook for managing notification state and actions
 */
export function useNotifications() {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const addSuccessNotification = (title: string, message: string, actionUrl?: string) => {
    addNotification({
      title,
      message,
      type: "success",
      actionUrl,
      actionLabel: actionUrl ? "View" : undefined,
    });
  };

  const addErrorNotification = (title: string, message: string, actionUrl?: string) => {
    addNotification({
      title,
      message,
      type: "error",
      actionUrl,
      actionLabel: actionUrl ? "Resolve" : undefined,
    });
  };

  const addWarningNotification = (title: string, message: string, actionUrl?: string) => {
    addNotification({
      title,
      message,
      type: "warning",
      actionUrl,
      actionLabel: actionUrl ? "Review" : undefined,
    });
  };

  const addInfoNotification = (title: string, message: string, actionUrl?: string) => {
    addNotification({
      title,
      message,
      type: "info",
      actionUrl,
      actionLabel: actionUrl ? "View" : undefined,
    });
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    addSuccessNotification,
    addErrorNotification,
    addWarningNotification,
    addInfoNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
}