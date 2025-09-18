import React from "react";
import { cn } from "@/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  lines?: number;
  height?: string | number;
  width?: string | number;
  children?: React.ReactNode;
}

export function LoadingSkeleton({
  className,
  variant = "rectangular",
  lines = 1,
  height,
  width,
  children,
}: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 rounded";

  const getVariantClasses = () => {
    switch (variant) {
      case "text":
        return "h-4 rounded";
      case "circular":
        return "rounded-full";
      case "rectangular":
        return "rounded";
      case "card":
        return "rounded-lg";
      default:
        return "rounded";
    }
  };

  const getHeight = () => {
    if (height) return { height };
    switch (variant) {
      case "text":
        return { height: "1rem" };
      case "circular":
        return { height: "2.5rem", width: "2.5rem" };
      case "card":
        return { height: "8rem" };
      default:
        return { height: "1.5rem" };
    }
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(baseClasses, getVariantClasses())}
            style={{
              ...getHeight(),
              width: index === lines - 1 ? "75%" : width || "100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, getVariantClasses(), className)}
      style={{
        ...getHeight(),
        width: width || (variant === "circular" ? getHeight().width : "100%"),
      }}
    >
      {children}
    </div>
  );
}

// Specific skeleton components for common use cases
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <LoadingSkeleton variant="circular" />
          <LoadingSkeleton width="4rem" height="1rem" />
        </div>
        <div className="space-y-2">
          <LoadingSkeleton width="8rem" height="2rem" />
          <LoadingSkeleton width="12rem" height="1rem" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="animate-pulse space-y-4">
        <LoadingSkeleton width="8rem" height="1.25rem" />
        <LoadingSkeleton width="12rem" height="1rem" />
        <LoadingSkeleton height="16rem" className="mt-4" />
      </div>
    </div>
  );
}

export function SkeletonList({ 
  items = 3, 
  className 
}: { 
  items?: number; 
  className?: string; 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="animate-pulse flex items-start space-x-3">
          <LoadingSkeleton variant="circular" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton width="75%" height="1rem" />
            <LoadingSkeleton width="50%" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

LoadingSkeleton.displayName = "LoadingSkeleton";