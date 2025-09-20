import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Warning, Info, XCircle } from '@phosphor-icons/react';
import { cn } from '@/shared/lib';
import { useToastStore, type Toast } from '@/app/stores/toasts';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  useEffect(() => {
    if (!toast.persistent && toast.duration) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.persistent, toast.duration, onRemove]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <Warning size={20} className="text-yellow-500" />;
      case 'info':
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out max-w-sm',
        getColorClasses(),
        isExiting
          ? 'transform translate-x-full opacity-0'
          : 'transform translate-x-0 opacity-100',
        'animate-in slide-in-from-right'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {toast.title}
          </h4>
        )}
        <p className="text-sm text-gray-700 leading-relaxed">
          {toast.message}
        </p>

        {/* Actions */}
        {toast.actions && toast.actions.length > 0 && (
          <div className="mt-3 flex gap-2">
            {toast.actions.map((action: any, index: number) => (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  if (!action.keepOpen) {
                    handleRemove();
                  }
                }}
                className={cn(
                  'text-xs px-2 py-1 rounded font-medium transition-colors',
                  action.primary
                    ? 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
                    : 'text-gray-700 hover:text-gray-900'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function ToastContainer({ 
  position = 'top-right',
  maxToasts = 5 
}: ToastContainerProps) {
  const { toasts, removeToast } = useToastStore();
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create container if it doesn't exist
    let toastRoot = document.getElementById('toast-root');
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = 'toast-root';
      toastRoot.style.position = 'fixed';
      toastRoot.style.zIndex = '9999';
      toastRoot.style.pointerEvents = 'none';
      
      // Position the container
      const positions = {
        'top-right': { top: '1rem', right: '1rem' },
        'top-left': { top: '1rem', left: '1rem' },
        'bottom-right': { bottom: '1rem', right: '1rem' },
        'bottom-left': { bottom: '1rem', left: '1rem' },
        'top-center': { top: '1rem', left: '50%', transform: 'translateX(-50%)' },
        'bottom-center': { bottom: '1rem', left: '50%', transform: 'translateX(-50%)' },
      };

      Object.assign(toastRoot.style, positions[position]);
      document.body.appendChild(toastRoot);
    }
    
    setContainer(toastRoot);

    return () => {
      // Clean up container if no toasts
      if (toastRoot && toasts.length === 0) {
        toastRoot.remove();
      }
    };
  }, [position, toasts.length]);

  if (!container || toasts.length === 0) return null;

  // Limit number of displayed toasts
  const displayedToasts = toasts.slice(0, maxToasts);

  return createPortal(
    <div 
      className="flex flex-col gap-3"
      style={{ pointerEvents: 'auto' }}
    >
      {displayedToasts.map((toast: Toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>,
    container
  );
}

// Provider component to ensure ToastContainer is rendered
export function ToastProvider({ 
  children,
  ...toastContainerProps 
}: { 
  children: React.ReactNode;
} & ToastContainerProps) {
  return (
    <>
      {children}
      <ToastContainer {...toastContainerProps} />
    </>
  );
}