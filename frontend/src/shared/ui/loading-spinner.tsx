import { forwardRef } from "react";
import { cn } from "@/shared/lib";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "spin" | "pulse" | "bounce" | "dots" | "bars";
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "white";
  className?: string;
}

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(({
  size = "md",
  variant = "spin",
  color = "primary",
  className,
}, ref) => {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4", 
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const colorClasses = {
    primary: "text-blue-600 border-blue-600",
    secondary: "text-gray-600 border-gray-600", 
    success: "text-green-600 border-green-600",
    warning: "text-yellow-600 border-yellow-600",
    danger: "text-red-600 border-red-600",
    white: "text-white border-white",
  };

  if (variant === "spin") {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-2 border-gray-200",
          `border-t-current ${colorClasses[color]}`,
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label="Loading"
      />
    );
  }

  if (variant === "pulse") {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-full bg-current",
          colorClasses[color],
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label="Loading"
      />
    );
  }

  if (variant === "bounce") {
    const dotSize = {
      xs: "w-1 h-1",
      sm: "w-1.5 h-1.5",
      md: "w-2 h-2", 
      lg: "w-3 h-3",
      xl: "w-4 h-4",
    };

    return (
      <div
        ref={ref}
        className={cn("flex space-x-1", className)}
        role="status"
        aria-label="Loading"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-bounce rounded-full bg-current",
              colorClasses[color],
              dotSize[size]
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: "0.6s"
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "dots") {
    const dotSize = {
      xs: "w-1 h-1",
      sm: "w-1.5 h-1.5",
      md: "w-2 h-2",
      lg: "w-2.5 h-2.5", 
      xl: "w-3 h-3",
    };

    return (
      <div
        ref={ref}
        className={cn("flex space-x-1", className)}
        role="status"
        aria-label="Loading"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse rounded-full bg-current",
              colorClasses[color],
              dotSize[size]
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: "1s"
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "bars") {
    const barHeight = {
      xs: "h-3",
      sm: "h-4",
      md: "h-6",
      lg: "h-8",
      xl: "h-12",
    };

    const barWidth = {
      xs: "w-0.5",
      sm: "w-0.5",
      md: "w-1",
      lg: "w-1",
      xl: "w-1.5",
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-end space-x-0.5", className)}
        role="status"
        aria-label="Loading"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse bg-current rounded-sm",
              colorClasses[color],
              barWidth[size],
              barHeight[size]
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: "0.8s",
              transformOrigin: "bottom"
            }}
          />
        ))}
      </div>
    );
  }

  // Default fallback to spin
  return (
    <div
      ref={ref}
      className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-current",
        colorClasses[color],
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
});

LoadingSpinner.displayName = "LoadingSpinner";

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  spinner?: React.ComponentProps<typeof LoadingSpinner>;
  blur?: boolean;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  children,
  spinner = {},
  blur = true,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "transition-all duration-200",
        isLoading && blur && "blur-sm opacity-60"
      )}>
        {children}
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <LoadingSpinner {...spinner} />
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
