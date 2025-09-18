import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";
import { cn } from "@/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    direction: "up" | "down" | "neutral";
    percentage: number;
    period?: string;
  };
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  description?: string;
}

export function MetricsCard({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick,
  className,
  description,
}: MetricsCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? TrendUp
      : trend?.direction === "down"
      ? TrendDown
      : Minus;

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white rounded-lg border border-gray-200 p-6 shadow-sm",
          "animate-pulse",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-md" />
          <div className="w-16 h-4 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-24 h-6 bg-gray-200 rounded" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-gray-300",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg text-blue-600">
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
              trend.direction === "up" && "bg-green-100 text-green-700",
              trend.direction === "down" && "bg-red-100 text-red-700",
              trend.direction === "neutral" && "bg-gray-100 text-gray-600"
            )}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{trend.percentage}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div className="text-sm text-gray-600 mb-2">{title}</div>
        {description && (
          <div className="text-xs text-gray-500">{description}</div>
        )}
        {trend?.period && (
          <div className="text-xs text-gray-500 mt-2">vs {trend.period}</div>
        )}
      </div>
    </div>
  );
}

MetricsCard.displayName = "MetricsCard";
