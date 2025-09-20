import { Database, HardDrives, Pulse, Clock } from "@phosphor-icons/react";
import { MetricsCard } from "./MetricsCard";

interface DatabaseStatsData {
  totalDatabases: number;
  totalStorageGB: number;
  queriesToday: number;
  avgQueryTimeMs: number;
}

interface DatabaseStatsWidgetProps {
  data?: DatabaseStatsData;
  isLoading?: boolean;
  onCardClick?: (metric: string) => void;
  className?: string;
}

export function DatabaseStatsWidget({
  data,
  isLoading = false,
  onCardClick,
  className,
}: DatabaseStatsWidgetProps) {
  // Mock data for development
  const mockData: DatabaseStatsData = {
    totalDatabases: 12,
    totalStorageGB: 4.7,
    queriesToday: 247,
    avgQueryTimeMs: 89,
  };

  const stats = data || mockData;

  const metricsData = [
    {
      key: "databases",
      title: "Total Databases",
      value: stats.totalDatabases,
      icon: <Database className="w-6 h-6" />,
      trend: {
        direction: "up" as const,
        percentage: 8,
        period: "last month",
      },
      description: "Active databases",
    },
    {
      key: "storage",
      title: "Storage Used",
      value: `${stats.totalStorageGB} GB`,
      icon: <HardDrives className="w-6 h-6" />,
      trend: {
        direction: "up" as const,
        percentage: 12,
        period: "last week",
      },
      description: "Total storage consumption",
    },
    {
      key: "queries",
      title: "Queries Today",
      value: stats.queriesToday,
      icon: <Pulse className="w-6 h-6" />,
      trend: {
        direction: "down" as const,
        percentage: 3,
        period: "yesterday",
      },
      description: "Executed successfully",
    },
    {
      key: "performance",
      title: "Avg Query Time",
      value: `${stats.avgQueryTimeMs}ms`,
      icon: <Clock className="w-6 h-6" />,
      trend: {
        direction: "down" as const,
        percentage: 15,
        period: "last hour",
      },
      description: "Response time",
    },
  ];

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${
        className || ""
      }`}
    >
      {metricsData.map((metric) => (
        <MetricsCard
          key={metric.key}
          title={metric.title}
          value={metric.value}
          icon={metric.icon}
          trend={metric.trend}
          description={metric.description}
          isLoading={isLoading}
          onClick={() => onCardClick?.(metric.key)}
          className="hover:scale-[1.02] transition-transform"
        />
      ))}
    </div>
  );
}

DatabaseStatsWidget.displayName = "DatabaseStatsWidget";
