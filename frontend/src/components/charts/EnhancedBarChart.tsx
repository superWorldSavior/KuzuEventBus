import { useState, useRef } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DownloadSimple, Spinner } from "@phosphor-icons/react";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";

export interface BarChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
  [key: string]: any;
}

export interface BarConfig {
  key: string;
  name: string;
  color: string;
  stackId?: string;
}

export interface EnhancedBarChartProps {
  data: BarChartDataPoint[];
  bars?: BarConfig[];
  title?: string;
  subtitle?: string;
  xAxisKey?: string;
  className?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showExport?: boolean;
  isLoading?: boolean;
  error?: string | null;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
  onExport?: (format: "png" | "svg" | "csv") => void;
}

export function EnhancedBarChart({
  data,
  bars = [{ key: "value", name: "Value", color: "#3B82F6" }],
  title,
  subtitle,
  xAxisKey = "name",
  className,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showExport = false,
  isLoading = false,
  error = null,
  formatValue = (value: number) => value.toString(),
  formatLabel = (label: string) => label,
  onExport,
}: EnhancedBarChartProps) {
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "csv">("png");
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (onExport) {
      onExport(exportFormat);
    } else {
      // Default export implementation
      if (exportFormat === "csv") {
        exportToCSV();
      } else {
        exportToImage(exportFormat);
      }
    }
  };

  const exportToCSV = () => {
    const headers = [xAxisKey, ...bars.map(bar => bar.name)];
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        [
          row[xAxisKey],
          ...bars.map(bar => row[bar.key] || 0)
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chart-data-${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToImage = (format: "png" | "svg") => {
    // This would need html2canvas or similar library in a real implementation
    console.log(`Exporting chart as ${format}`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{formatLabel(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 text-gray-500">
            <Spinner className="w-5 h-5 animate-spin" />
            <span>Loading chart...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-red-50 rounded-lg">
          <div className="text-center">
            <p className="text-red-600 font-medium">Error loading chart</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-gray-500 font-medium">No data available</p>
            <p className="text-gray-400 text-sm mt-1">Chart will appear when data is loaded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      {(title || subtitle || showExport) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          
          {showExport && (
            <div className="flex items-center space-x-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "png" | "svg" | "csv")}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
                <option value="csv">CSV</option>
              </select>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <DownloadSimple className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              tickFormatter={formatLabel}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              tickFormatter={formatValue}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.name}
                fill={bar.color}
                stackId={bar.stackId}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <span>{data.length} data points</span>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

EnhancedBarChart.displayName = "EnhancedBarChart";