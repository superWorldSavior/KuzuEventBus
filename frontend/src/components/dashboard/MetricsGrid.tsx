import React from "react";
import { MetricsCard } from "./MetricsCard";
import { cn } from "@/utils";

interface MetricsGridProps {
  metrics: Array<{
    id: string;
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
      direction: "up" | "down" | "neutral";
      percentage: number;
      period?: string;
    };
    description?: string;
    onClick?: () => void;
  }>;
  isLoading?: boolean;
  className?: string;
}

export function MetricsGrid({ 
  metrics, 
  isLoading = false, 
  className 
}: MetricsGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
        className
      )}
    >
      {metrics.map((metric) => (
        <MetricsCard
          key={metric.id}
          title={metric.title}
          value={metric.value}
          icon={metric.icon}
          trend={metric.trend}
          isLoading={isLoading}
          onClick={metric.onClick}
          description={metric.description}
        />
      ))}
    </div>
  );
}

MetricsGrid.displayName = "MetricsGrid";