import { useEffect } from "react";
import { useNotificationStore, mockNotifications, type Notification } from "../../app/stores/notifications";

/**
 * Hook to initialize demo notifications for development/demo purposes only
 * This should be removed in production when real notification system is implemented
 */
export function useNotificationInit(enableMockData = false) {
  const { addNotification, notifications } = useNotificationStore();

  useEffect(() => {
    // Only add mock notifications if explicitly enabled AND none exist
    if (enableMockData && notifications.length === 0 && import.meta.env.DEV) {
      // Add mock notifications with some delay to simulate real-time arrival
      mockNotifications.forEach((notification: Omit<Notification, "id" | "timestamp" | "read">, index: number) => {
        setTimeout(() => {
          addNotification(notification);
        }, index * 1000); // Stagger by 1 second each
      });
    }
  }, [enableMockData, addNotification, notifications.length]);
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