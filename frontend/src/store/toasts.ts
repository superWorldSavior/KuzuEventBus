import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ToastAction {
  label: string;
  action: () => void;
  primary?: boolean;
  keepOpen?: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // in milliseconds, undefined means persistent
  persistent?: boolean;
  actions?: ToastAction[];
  timestamp: number;
}

interface ToastState {
  toasts: Toast[];
  maxToasts: number;

  // Actions
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id' | 'timestamp'>>) => void;
  
  // Helper methods for common toast types
  success: (message: string, options?: Partial<Toast>) => string;
  error: (message: string, options?: Partial<Toast>) => string;
  warning: (message: string, options?: Partial<Toast>) => string;
  info: (message: string, options?: Partial<Toast>) => string;
}

const generateId = () => `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_DURATIONS = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 0, // Errors are persistent by default
} as const;

export const useToastStore = create<ToastState>()(
  subscribeWithSelector((set, get) => ({
    toasts: [],
    maxToasts: 5,

    addToast: (toastData) => {
      const id = generateId();
      const timestamp = Date.now();
      
      const toast: Toast = {
        ...toastData,
        id,
        timestamp,
        duration: toastData.duration ?? DEFAULT_DURATIONS[toastData.type],
        persistent: toastData.persistent ?? toastData.type === 'error',
      };

      set((state) => {
        const newToasts = [toast, ...state.toasts];
        
        // Limit number of toasts
        if (newToasts.length > state.maxToasts) {
          newToasts.splice(state.maxToasts);
        }
        
        return { toasts: newToasts };
      });

      return id;
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    },

    clearAllToasts: () => {
      set({ toasts: [] });
    },

    updateToast: (id, updates) => {
      set((state) => ({
        toasts: state.toasts.map((toast) =>
          toast.id === id ? { ...toast, ...updates } : toast
        ),
      }));
    },

    success: (message, options = {}) => {
      return get().addToast({
        type: 'success',
        message,
        ...options,
      });
    },

    error: (message, options = {}) => {
      return get().addToast({
        type: 'error',
        message,
        persistent: true,
        ...options,
      });
    },

    warning: (message, options = {}) => {
      return get().addToast({
        type: 'warning',
        message,
        ...options,
      });
    },

    info: (message, options = {}) => {
      return get().addToast({
        type: 'info',
        message,
        ...options,
      });
    },
  }))
);

// Hook for easy toast creation
export function useToast() {
  const { success, error, warning, info, removeToast, clearAllToasts } = useToastStore();

  return {
    toast: {
      success,
      error,
      warning,
      info,
    },
    dismiss: removeToast,
    dismissAll: clearAllToasts,
  };
}

// Utility functions for common toast patterns
export const createApiErrorToast = (error: any, operation: string): Omit<Toast, 'id' | 'timestamp'> => {
  const message = error?.response?.data?.message || error?.message || 'An unexpected error occurred';
  
  return {
    type: 'error',
    title: `${operation} Failed`,
    message,
    persistent: true,
    actions: [
      {
        label: 'Retry',
        action: () => {
          // This would be handled by the caller
          console.log('Retry requested');
        },
        primary: true,
      },
      {
        label: 'Report Issue',
        action: () => {
          // Open issue reporting
          window.open('mailto:support@kuzueventbus.com?subject=API Error Report', '_blank');
        },
      },
    ],
  };
};

export const createSuccessToast = (message: string, action?: ToastAction): Omit<Toast, 'id' | 'timestamp'> => {
  return {
    type: 'success',
    message,
    duration: 4000,
    actions: action ? [action] : undefined,
  };
};

export const createLoadingToast = (message: string): Omit<Toast, 'id' | 'timestamp'> => {
  return {
    type: 'info',
    message,
    persistent: true,
  };
};

export const createProgressToast = (
  message: string,
  progress: number,
  onCancel?: () => void
): Omit<Toast, 'id' | 'timestamp'> => {
  return {
    type: 'info',
    title: `${Math.round(progress)}% Complete`,
    message,
    persistent: true,
    actions: onCancel ? [
      {
        label: 'Cancel',
        action: onCancel,
      },
    ] : undefined,
  };
};

// Integration with real-time store for automatic toast creation
export const setupToastNotifications = () => {
  // This would integrate with the real-time store to automatically create toasts
  // for certain types of notifications
  console.log('Toast notification system ready');
  
  return () => {
    // Cleanup function
  };
};