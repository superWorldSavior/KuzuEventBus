import { forwardRef, ReactNode, useState, useId } from "react";
import { cn } from "@/shared/lib";
import { Eye, EyeSlash, Warning, Check } from "@phosphor-icons/react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "filled";
  showPasswordToggle?: boolean;
  isLoading?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  helperText,
  leftIcon,
  rightIcon,
  size = "md",
  variant = "default",
  showPasswordToggle = false,
  isLoading = false,
  className,
  type = "text",
  disabled,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const id = useId();
  const inputId = props.id || id;

  const actualType = showPasswordToggle && type === "password" 
    ? (showPassword ? "text" : "password")
    : type;

  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);
  const hasIcon = Boolean(leftIcon);
  const hasRightContent = Boolean(rightIcon || showPasswordToggle || isLoading);

  const containerClasses = [
    "relative group",
    "transition-all duration-200 ease-in-out",
    isFocused && "transform scale-[1.01]",
  ];

  const inputClasses = [
    "block w-full border rounded-lg",
    "transition-all duration-200 ease-in-out",
    "placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-offset-1",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
    
    // Size variants
    size === "sm" && "px-3 py-2 text-sm",
    size === "md" && "px-3.5 py-2.5 text-sm",
    size === "lg" && "px-4 py-3 text-base",
    
    // Icon padding
    hasIcon && {
      sm: "pl-9",
      md: "pl-10", 
      lg: "pl-11",
    }[size],
    
    hasRightContent && {
      sm: "pr-9",
      md: "pr-10",
      lg: "pr-11",
    }[size],

    // State variants
    variant === "default" && [
      "bg-white border-gray-300",
      "hover:border-gray-400 hover:shadow-sm",
      "focus:border-blue-500 focus:ring-blue-500/20",
    ],
    
    variant === "filled" && [
      "bg-gray-50 border-gray-200", 
      "hover:bg-gray-100 hover:border-gray-300",
      "focus:bg-white focus:border-blue-500 focus:ring-blue-500/20",
    ],

    // Error state
    hasError && [
      "border-red-300 bg-red-50",
      "focus:border-red-500 focus:ring-red-500/20",
    ],

    // Success state  
    hasSuccess && [
      "border-green-300 bg-green-50",
      "focus:border-green-500 focus:ring-green-500/20",
    ],
  ];

  const iconClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-5 h-5",
  };

  const iconPositions = {
    left: {
      sm: "left-2.5 top-2.5",
      md: "left-3 top-3",
      lg: "left-3.5 top-3.5",
    },
    right: {
      sm: "right-2.5 top-2.5",
      md: "right-3 top-3", 
      lg: "right-3.5 top-3.5",
    },
  };

  // For simple usage without advanced features, keep the original simple interface
  if (!label && !error && !success && !helperText && !leftIcon && !rightIcon && !showPasswordToggle && !isLoading) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className={cn(containerClasses)}>
        {leftIcon && (
          <div className={cn(
            "absolute pointer-events-none text-gray-400",
            "transition-colors duration-200",
            iconPositions.left[size],
            iconClasses[size],
            isFocused && "text-blue-500",
            hasError && "text-red-400",
            hasSuccess && "text-green-400"
          )}>
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={actualType}
          className={cn(inputClasses, className)}
          disabled={disabled || isLoading}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {hasRightContent && (
          <div className={cn(
            "absolute inset-y-0 right-0 flex items-center",
            iconPositions.right[size].includes("right-2.5") ? "pr-2.5" :
            iconPositions.right[size].includes("right-3") ? "pr-3" : "pr-3.5"
          )}>
            {isLoading ? (
              <div className={cn(
                "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
                iconClasses[size]
              )} />
            ) : showPasswordToggle && type === "password" ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  "text-gray-400 hover:text-gray-600 transition-colors",
                  iconClasses[size]
                )}
                tabIndex={-1}
              >
                {showPassword ? <EyeSlash /> : <Eye />}
              </button>
            ) : rightIcon ? (
              <div className={cn(
                "text-gray-400",
                iconClasses[size],
                hasError && "text-red-400",
                hasSuccess && "text-green-400"
              )}>
                {rightIcon}
              </div>
            ) : null}
          </div>
        )}

        {/* State indicators */}
        {hasError && (
          <div className={cn(
            "absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none",
            hasRightContent && {
              sm: "pr-8",
              md: "pr-9",
              lg: "pr-10",
            }[size]
          )}>
            <Warning className={cn("text-red-400", iconClasses[size])} />
          </div>
        )}

        {hasSuccess && !hasRightContent && (
          <div className={cn(
            "absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
          )}>
            <Check className={cn("text-green-400", iconClasses[size])} />
          </div>
        )}
      </div>

      {/* Helper text */}
      {(error || success || helperText) && (
        <div className="mt-1.5 text-sm">
          {error && (
            <p className="text-red-600 flex items-center gap-1">
              <Warning className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </p>
          )}
          {helperText && !error && !success && (
            <p className="text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = "Input";