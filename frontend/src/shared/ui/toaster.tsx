import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { Toast } from './toast';

interface ToastContextType {
  toast: (props: ToastProps) => void;
}

interface ToastProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  description?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface ToastItem extends ToastProps {
  id: string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: ToastItem = {
      id,
      ...props,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast if autoClose is enabled
    if (props.autoClose !== false) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, props.autoCloseDelay || 5000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            onClose={() => removeToast(toast.id)}
            autoClose={toast.autoClose}
            autoCloseDelay={toast.autoCloseDelay}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Toaster() {
  return null; // The actual toaster is rendered by ToastProvider
}