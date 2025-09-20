import { forwardRef, ReactNode } from "react";
import { cn } from "@/shared/lib";
import { MicroInteraction } from "./animations";
import { LoadingSpinner } from "./loading-spinner";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "elevated" | "bordered" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  clickable?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = "default",
  padding = "md",
  hover = false,
  clickable = false,
  loading = false,
  className,
  onClick,
}, ref) => {
  const baseClasses = [
    "rounded-lg transition-all duration-200 ease-in-out",
    "relative overflow-hidden",
  ];

  const variants = {
    default: [
      "bg-white border border-gray-200",
      "shadow-sm",
    ],
    elevated: [
      "bg-white border border-gray-100",
      "shadow-lg",
    ],
    bordered: [
      "bg-white border-2 border-gray-200",
      "shadow-none",
    ],
    ghost: [
      "bg-gray-50 border border-transparent",
      "shadow-none",
    ],
  };

  const paddings = {
    none: "p-0",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const hoverEffects = hover || clickable ? [
    "hover:shadow-md hover:shadow-gray-200/50",
    "hover:border-gray-300",
    "hover:-translate-y-0.5",
  ] : [];

  const clickableClasses = clickable || onClick ? [
    "cursor-pointer",
    "active:translate-y-0",
    "active:shadow-sm",
  ] : [];

  const CardWrapper = hover || clickable ? MicroInteraction : "div";
  const wrapperProps = hover || clickable ? { hover: true, active: true, disabled: loading } : {};

  return (
    <CardWrapper {...wrapperProps}>
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          paddings[padding],
          hoverEffects,
          clickableClasses,
          loading && "pointer-events-none",
          className
        )}
        onClick={onClick}
        role={clickable || onClick ? "button" : undefined}
        tabIndex={clickable || onClick ? 0 : undefined}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <LoadingSpinner size="md" variant="spin" />
          </div>
        )}
        
        {/* Shimmer effect overlay for loading */}
        {loading && (
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}
        
        <div className={cn(loading && "opacity-50")}>
          {children}
        </div>
      </div>
    </CardWrapper>
  );
});

Card.displayName = "Card";

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export function CardTitle({ children, level = 2, className }: CardTitleProps) {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;
  
  const levelClasses = {
    1: "text-2xl font-bold text-gray-900",
    2: "text-xl font-semibold text-gray-900", 
    3: "text-lg font-semibold text-gray-900",
    4: "text-base font-semibold text-gray-900",
  };

  return (
    <Component className={cn(levelClasses[level], className)}>
      {children}
    </Component>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-600 mt-1", className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
  justify?: "start" | "center" | "end" | "between";
}

export function CardFooter({ children, className, justify = "start" }: CardFooterProps) {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center", 
    end: "justify-end",
    between: "justify-between",
  };

  return (
    <div className={cn(
      "flex items-center gap-3 mt-6 pt-4 border-t border-gray-100",
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  );
}

interface CardSkeletonProps {
  variant?: "default" | "elevated" | "bordered" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export function CardSkeleton({ variant = "default", padding = "md", className }: CardSkeletonProps) {
  return (
    <Card variant={variant} padding={padding} className={className}>
      <CardHeader>
        <div className="flex items-start gap-3 flex-1">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6" />
        </div>
        
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse mt-4" />
      </CardContent>
      
      <CardFooter justify="between">
        <div className="flex items-center gap-2">
          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-12 h-6 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}