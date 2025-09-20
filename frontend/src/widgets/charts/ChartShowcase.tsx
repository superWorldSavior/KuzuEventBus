import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { cn } from "@/shared/lib";

interface ChartShowcaseProps {
  className?: string;
  isLoading?: boolean;
}

export function ChartShowcase({ className, isLoading = false }: ChartShowcaseProps) {
  // Sample data for demonstration
  const queryPerformanceData = [
    { name: "Mon", value: 45, queries: 124 },
    { name: "Tue", value: 52, queries: 143 },
    { name: "Wed", value: 38, queries: 98 },
    { name: "Thu", value: 61, queries: 167 },
    { name: "Fri", value: 43, queries: 132 },
    { name: "Sat", value: 29, queries: 78 },
    { name: "Sun", value: 35, queries: 89 },
  ];

  const storageUsageData = [
    { name: "Week 1", value: 2.3 },
    { name: "Week 2", value: 2.8 },
    { name: "Week 3", value: 3.1 },
    { name: "Week 4", value: 3.5 },
    { name: "Week 5", value: 3.9 },
    { name: "Week 6", value: 4.2 },
  ];

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Query Performance Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Average Query Time
          </h3>
          <p className="text-sm text-gray-500">
            Performance over the last 7 days (ms)
          </p>
        </div>
        <LineChart
          data={queryPerformanceData}
          dataKey="value"
          height={200}
          lineColor="#10B981"
          showDots={true}
        />
      </div>

      {/* Storage Usage Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Storage Usage
          </h3>
          <p className="text-sm text-gray-500">
            Database storage growth (GB)
          </p>
        </div>
        <BarChart
          data={storageUsageData}
          bars={[{ dataKey: "value", fill: "#3B82F6", name: "Storage (GB)" }]}
          height={200}
          showGrid={true}
        />
      </div>
    </div>
  );
}

ChartShowcase.displayName = "ChartShowcase";