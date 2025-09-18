// Export all chart components for easy importing
// Legacy chart components
export { BarChart } from "./BarChart";
export { LineChart } from "./LineChart";
export { ChartShowcase } from "./ChartShowcase";

// Enhanced Charts
export { EnhancedBarChart } from "./EnhancedBarChart";
export { EnhancedLineChart } from "./EnhancedLineChart";
export { EnhancedChartShowcase } from "./EnhancedChartShowcase";

// Types from Bar Chart
export type {
  BarChartDataPoint,
  BarConfig,
  EnhancedBarChartProps,
} from "./EnhancedBarChart";

// Types from Line Chart  
export type {
  LineChartDataPoint,
  LineConfig,
  EnhancedLineChartProps,
} from "./EnhancedLineChart";
