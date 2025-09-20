import { forwardRef, ReactNode } from "react";
import { cn } from "@/utils";
import { LoadingSpinner } from "./loading-spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "default";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const baseClasses = [
    "relative inline-flex items-center justify-center font-medium",
    "transition-all duration-200 ease-in-out",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    "transform hover:scale-[1.02] active:scale-[0.98]",
  ];

  const variants = {
    primary: [
      "bg-blue-600 text-white border border-transparent",
      "hover:bg-blue-700 hover:shadow-lg",
      "focus:ring-blue-500",
      "active:bg-blue-800",
    ],
    // Keep backward compatibility with "default"
    default: [
      "bg-blue-600 text-white border border-transparent",
      "hover:bg-blue-700 hover:shadow-lg",
      "focus:ring-blue-500",
      "active:bg-blue-800",
    ],
    secondary: [
      "bg-gray-100 text-gray-900 border border-gray-200",
      "hover:bg-gray-200 hover:shadow-md",
      "focus:ring-gray-500",
      "active:bg-gray-300",
    ],
    outline: [
      "bg-white text-gray-700 border border-gray-300",
      "hover:bg-gray-50 hover:border-gray-400 hover:shadow-md",
      "focus:ring-blue-500",
      "active:bg-gray-100",
    ],
    ghost: [
      "bg-transparent text-gray-700 border border-transparent",
      "hover:bg-gray-100 hover:shadow-sm",
      "focus:ring-gray-500",
      "active:bg-gray-200",
    ],
    danger: [
      "bg-red-600 text-white border border-transparent",
      "hover:bg-red-700 hover:shadow-lg",
      "focus:ring-red-500",
      "active:bg-red-800",
    ],
  };

  const sizes = {
    xs: "px-2.5 py-1.5 text-xs rounded-md gap-1",
    sm: "px-3 py-2 text-sm rounded-md gap-1.5",
    md: "px-4 py-2.5 text-sm rounded-lg gap-2",
    lg: "px-6 py-3 text-base rounded-lg gap-2.5",
  };

  const spinnerSizes = {
    xs: "sm" as const,
    sm: "sm" as const,
    md: "sm" as const,
    lg: "md" as const,
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner
          size={spinnerSizes[size]}
          className="absolute"
        />
      )}
      
      <span className={cn(
        "flex items-center gap-inherit",
        isLoading && "opacity-0"
      )}>
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {isLoading && loadingText ? loadingText : children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </span>
    </button>
  );
});

Button.displayName = "Button";