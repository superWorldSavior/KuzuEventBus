import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isOpen: false,
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      ...initialState,

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          read: false,
        };

        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          );

          const unreadCount = updatedNotifications.filter((n) => !n.read).length;

          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notification) => ({
            ...notification,
            read: true,
          })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.filter(
            (notification) => notification.id !== id
          );
          const unreadCount = updatedNotifications.filter((n) => !n.read).length;

          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      setOpen: (isOpen) => set({ isOpen }),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "notification-storage",
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Mock notifications for development/demo purposes
export const mockNotifications: Array<Omit<Notification, "id" | "timestamp" | "read">> = [
  {
    title: "Database Created",
    message: "New database 'customer-analytics' has been successfully created",
    type: "success",
    actionUrl: "/databases",
    actionLabel: "View Database"
  },
  {
    title: "Query Completed",
    message: "Customer segmentation query finished in 2.3s",
    type: "info",
    actionUrl: "/queries",
    actionLabel: "View Results"
  },
  {
    title: "High Memory Usage",
    message: "Database 'logistics-db' is using 85% of allocated memory",
    type: "warning",
    actionUrl: "/analytics",
    actionLabel: "View Metrics"
  }
];

// Real notifications now come from real-time SSE events
// See useSSENotifications hook for real implementation