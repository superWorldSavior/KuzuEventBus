import { forwardRef, ReactNode, useEffect, useState } from "react";
import { X, Check, Warning, Info } from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { SlideIn } from "./animations";

interface ToastProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  description?: string;
  action?: ReactNode;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(({
  variant = "info",
  title,
  description,
  action,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  icon,
  className,
  children,
}, ref) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!autoClose) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (autoCloseDelay / 50));
        if (newProgress <= 0) {
          setIsVisible(false);
          if (onClose) {
            setTimeout(onClose, 300); // Allow fade out animation
          }
          return 0;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [autoClose, autoCloseDelay, onClose]);

  const variants = {
    success: {
      container: "bg-green-50 border-green-200 text-green-800",
      icon: "text-green-600",
      progress: "bg-green-500",
      defaultIcon: <Check className="w-5 h-5" />,
    },
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: "text-red-600", 
      progress: "bg-red-500",
      defaultIcon: <Warning className="w-5 h-5" />,
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 text-yellow-800",
      icon: "text-yellow-600",
      progress: "bg-yellow-500", 
      defaultIcon: <Warning className="w-5 h-5" />,
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-800",
      icon: "text-blue-600",
      progress: "bg-blue-500",
      defaultIcon: <Info className="w-5 h-5" />,
    },
  };

  const currentVariant = variants[variant];

  return (
    <SlideIn direction="right" duration={300}>
      <div
        ref={ref}
        className={cn(
          "relative max-w-sm w-full bg-white border rounded-lg shadow-lg pointer-events-auto",
          "transform transition-all duration-300 ease-in-out",
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          currentVariant.container,
          className
        )}
        role="alert"
        aria-live="polite"
      >
        {/* Progress bar */}
        {autoClose && (
          <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full rounded-t-lg overflow-hidden">
            <div
              className={cn("h-full transition-all duration-75 ease-linear", currentVariant.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {(icon || currentVariant.defaultIcon) && (
              <div className={cn("flex-shrink-0 mt-0.5", currentVariant.icon)}>
                {icon || currentVariant.defaultIcon}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {title && (
                <div className="text-sm font-semibold leading-5">
                  {title}
                </div>
              )}
              
              {description && (
                <div className={cn(
                  "text-sm mt-1 leading-5",
                  title ? "opacity-90" : ""
                )}>
                  {description}
                </div>
              )}

              {children && (
                <div className="mt-2">
                  {children}
                </div>
              )}

              {action && (
                <div className="mt-3">
                  {action}
                </div>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className={cn(
                  "flex-shrink-0 rounded-md p-1.5 transition-colors duration-200",
                  "hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/10",
                  currentVariant.icon
                )}
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </SlideIn>
  );
});

Toast.displayName = "Toast";

interface ToastContainerProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  children: ReactNode;
  className?: string;
}

export function ToastContainer({
  position = "top-right",
  children,
  className,
}: ToastContainerProps) {
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4", 
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-2 pointer-events-none",
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CompactToastProps extends Omit<ToastProps, "title" | "description"> {
  message: string;
  compact?: boolean;
}

export function CompactToast({
  message,
  compact = true,
  variant = "info",
  ...props
}: CompactToastProps) {
  const variants = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-yellow-600 text-white",
    info: "bg-blue-600 text-white",
  };

  return (
    <SlideIn direction="down" duration={200}>
      <div
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium shadow-lg",
          variants[variant],
          props.className
        )}
        role="alert"
        aria-live="polite"
      >
        {message}
      </div>
    </SlideIn>
  );
}

// Hook for managing toast state
export function useToastState() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    props: ToastProps;
  }>>([]);

  const addToast = (props: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, props }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
}