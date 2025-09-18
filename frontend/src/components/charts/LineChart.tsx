import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/utils";

interface LineChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface LineChartProps {
  data: LineChartData[];
  dataKey?: string;
  xAxisKey?: string;
  className?: string;
  height?: number;
  lineColor?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  strokeWidth?: number;
}

export function LineChart({
  data,
  dataKey = "value",
  xAxisKey = "name",
  className,
  height = 300,
  lineColor = "#3B82F6",
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showDots = true,
  strokeWidth = 2,
}: LineChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
          )}
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            dot={showDots ? { r: 4, fill: lineColor } : false}
            activeDot={{ r: 6, fill: lineColor }}
            className="drop-shadow-sm"
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

LineChart.displayName = "LineChart";
