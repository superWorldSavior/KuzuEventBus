import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface RealTimeEvent {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
  source: 'sse' | 'websocket' | 'polling';
}

interface ConnectionStatus {
  sse: {
    dashboard: boolean;
    queries: boolean;
    databases: boolean;
  };
  websocket: {
    dashboard: boolean;
    queries: boolean;
  };
  lastUpdate: number;
  errors: Array<{
    type: 'sse' | 'websocket';
    service: string;
    error: string;
    timestamp: number;
  }>;
}

interface RealTimeNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface QueryProgress {
  queryId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  startTime?: number;
  endTime?: number;
  resultCount?: number;
  error?: string;
  currentStep?: string;
}

interface RealTimeState {
  // Connection management
  connections: ConnectionStatus;
  isEnabled: boolean;

  // Event history
  events: RealTimeEvent[];
  maxEvents: number;

  // Notifications
  notifications: RealTimeNotification[];
  unreadCount: number;

  // Query tracking
  activeQueries: Map<string, QueryProgress>;

  // Dashboard updates
  dashboardUpdates: {
    stats: any;
    metrics: any;
    activity: any[];
    lastUpdate: number;
  };

  // Actions
  setConnectionStatus: (service: 'sse' | 'websocket', name: string, connected: boolean) => void;
  addConnectionError: (type: 'sse' | 'websocket', service: string, error: string) => void;
  clearConnectionErrors: () => void;

  addEvent: (event: Omit<RealTimeEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;

  addNotification: (notification: Omit<RealTimeNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  updateQueryProgress: (queryId: string, progress: Partial<QueryProgress>) => void;
  removeQuery: (queryId: string) => void;
  clearCompletedQueries: () => void;

  updateDashboard: (updates: Partial<RealTimeState['dashboardUpdates']>) => void;

  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  connections: {
    sse: {
      dashboard: false,
      queries: false,
      databases: false,
    },
    websocket: {
      dashboard: false,
      queries: false,
    },
    lastUpdate: 0,
    errors: [],
  },
  isEnabled: true,
  events: [],
  maxEvents: 1000,
  notifications: [],
  unreadCount: 0,
  activeQueries: new Map(),
  dashboardUpdates: {
    stats: null,
    metrics: null,
    activity: [],
    lastUpdate: 0,
  },
};

export const useRealTimeStore = create<RealTimeState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setConnectionStatus: (service, name, connected) => {
      set((state) => ({
        connections: {
          ...state.connections,
          [service]: {
            ...state.connections[service],
            [name]: connected,
          },
          lastUpdate: Date.now(),
        },
      }));
    },

    addConnectionError: (type, service, error) => {
      set((state) => ({
        connections: {
          ...state.connections,
          errors: [
            ...state.connections.errors.slice(-9), // Keep last 10 errors
            {
              type,
              service,
              error,
              timestamp: Date.now(),
            },
          ],
        },
      }));
    },

    clearConnectionErrors: () => {
      set((state) => ({
        connections: {
          ...state.connections,
          errors: [],
        },
      }));
    },

    addEvent: (event) => {
      const newEvent: RealTimeEvent = {
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      set((state) => {
        const events = [...state.events, newEvent];
        // Keep only the last maxEvents
        if (events.length > state.maxEvents) {
          events.splice(0, events.length - state.maxEvents);
        }
        return { events };
      });
    },

    clearEvents: () => {
      set({ events: [] });
    },

    addNotification: (notification) => {
      const newNotification: RealTimeNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false,
      };

      set((state) => ({
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));

      // Auto-remove non-persistent notifications after 5 seconds
      if (!notification.persistent) {
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, 5000);
      }
    },

    markNotificationRead: (id) => {
      set((state) => {
        const notifications = state.notifications.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        );
        const unreadCount = notifications.filter((notif) => !notif.read).length;
        return { notifications, unreadCount };
      });
    },

    markAllNotificationsRead: () => {
      set((state) => ({
        notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
        unreadCount: 0,
      }));
    },

    removeNotification: (id) => {
      set((state) => {
        const notifications = state.notifications.filter((notif) => notif.id !== id);
        const unreadCount = notifications.filter((notif) => !notif.read).length;
        return { notifications, unreadCount };
      });
    },

    clearNotifications: () => {
      set({ notifications: [], unreadCount: 0 });
    },

    updateQueryProgress: (queryId, progress) => {
      set((state) => {
        const activeQueries = new Map(state.activeQueries);
        const existing = activeQueries.get(queryId) || { queryId, status: 'queued' as const };
        activeQueries.set(queryId, { ...existing, ...progress });
        return { activeQueries };
      });
    },

    removeQuery: (queryId) => {
      set((state) => {
        const activeQueries = new Map(state.activeQueries);
        activeQueries.delete(queryId);
        return { activeQueries };
      });
    },

    clearCompletedQueries: () => {
      set((state) => {
        const activeQueries = new Map();
        state.activeQueries.forEach((query, id) => {
          if (query.status === 'running' || query.status === 'queued') {
            activeQueries.set(id, query);
          }
        });
        return { activeQueries };
      });
    },

    updateDashboard: (updates) => {
      set((state) => ({
        dashboardUpdates: {
          ...state.dashboardUpdates,
          ...updates,
          lastUpdate: Date.now(),
        },
      }));
    },

    setEnabled: (enabled) => {
      set({ isEnabled: enabled });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Selectors for commonly used data
export const useConnectionStatus = () => 
  useRealTimeStore((state) => state.connections);

export const useUnreadNotifications = () => 
  useRealTimeStore((state) => state.notifications.filter((notif) => !notif.read));

export const useActiveQueries = () => 
  useRealTimeStore((state) => Array.from(state.activeQueries.values()));

export const useRecentEvents = (limit = 10) => 
  useRealTimeStore((state) => state.events.slice(-limit).reverse());

// Helper functions for creating specific notification types
export const createQueryNotification = (
  queryId: string,
  status: QueryProgress['status'],
  details?: string
): Omit<RealTimeNotification, 'id' | 'timestamp' | 'read'> => {
  const statusConfig = {
    queued: { type: 'info' as const, title: 'Query Queued' },
    running: { type: 'info' as const, title: 'Query Running' },
    completed: { type: 'success' as const, title: 'Query Completed' },
    failed: { type: 'error' as const, title: 'Query Failed' },
    cancelled: { type: 'warning' as const, title: 'Query Cancelled' },
  };

  const config = statusConfig[status];
  
  return {
    type: config.type,
    title: config.title,
    message: details || `Query ${queryId} ${status}`,
    persistent: status === 'failed',
  };
};

export const createDatabaseNotification = (
  databaseId: string,
  action: 'created' | 'updated' | 'deleted' | 'backup_completed',
  details?: string
): Omit<RealTimeNotification, 'id' | 'timestamp' | 'read'> => {
  const actionConfig = {
    created: { type: 'success' as const, title: 'Database Created' },
    updated: { type: 'info' as const, title: 'Database Updated' },
    deleted: { type: 'warning' as const, title: 'Database Deleted' },
    backup_completed: { type: 'success' as const, title: 'Backup Completed' },
  };

  const config = actionConfig[action];
  
  return {
    type: config.type,
    title: config.title,
    message: details || `Database ${databaseId} ${action.replace('_', ' ')}`,
  };
};