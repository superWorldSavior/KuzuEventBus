import { useState } from "react";
import { EnhancedBarChart, EnhancedLineChart } from "./index";
import { 
  BarChartDataPoint, 
  LineChartDataPoint, 
  BarConfig, 
  LineConfig 
} from "./index";

// Simple UI components for compatibility
const Button = ({ 
  children, 
  className, 
  onClick, 
  size = "md", 
  variant = "default"
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void; 
  size?: string; 
  variant?: string; 
}) => {
  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";
  const variantClasses = variant === "outline" 
    ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50" 
    : "border-blue-500 bg-blue-500 text-white hover:bg-blue-600";
  
  return (
    <button
      onClick={onClick}
      className={`${sizeClasses} font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${variantClasses} ${className || ""}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className || ""}`}>
    {children}
  </span>
);
const CardComp = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className || ""}`}>
    {children}
  </div>
);

const CardHeaderComp = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 pb-2">{children}</div>
);

const CardTitleComp = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-900">{children}</h3>
);

const CardContentComp = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 pt-0">{children}</div>
);

// Mock data for demonstrations
const performanceData: BarChartDataPoint[] = [
  { name: "Mon", value: 245, queries: 120, responseTime: 180 },
  { name: "Tue", value: 289, queries: 145, responseTime: 210 },
  { name: "Wed", value: 378, queries: 189, responseTime: 195 },
  { name: "Thu", value: 324, queries: 162, responseTime: 230 },
  { name: "Fri", value: 445, queries: 223, responseTime: 175 },
  { name: "Sat", value: 156, queries: 78, responseTime: 165 },
  { name: "Sun", value: 123, queries: 62, responseTime: 155 },
];

const trendsData: LineChartDataPoint[] = [
  { name: "Jan", users: 1200, databases: 12, storage: 45 },
  { name: "Feb", users: 1350, databases: 15, storage: 52 },
  { name: "Mar", users: 1580, databases: 18, storage: 68 },
  { name: "Apr", users: 1420, databases: 20, storage: 75 },
  { name: "May", users: 1680, databases: 22, storage: 82 },
  { name: "Jun", users: 1950, databases: 25, storage: 95 },
];

const storageData: BarChartDataPoint[] = [
  { name: "Analytics", value: 25.6, color: "#3B82F6" },
  { name: "User Data", value: 18.3, color: "#10B981" },
  { name: "Logs", value: 12.7, color: "#F59E0B" },
  { name: "Cache", value: 8.9, color: "#EF4444" },
  { name: "Backups", value: 15.2, color: "#8B5CF6" },
];

const barConfigs: BarConfig[] = [
  { key: "queries", name: "Queries", color: "#3B82F6" },
  { key: "responseTime", name: "Response Time (ms)", color: "#10B981" },
];

const lineConfigs: LineConfig[] = [
  { key: "users", name: "Active Users", color: "#3B82F6", strokeWidth: 3 },
  { key: "databases", name: "Databases", color: "#10B981", strokeWidth: 2 },
  { key: "storage", name: "Storage (GB)", color: "#F59E0B", strokeWidth: 2, strokeDasharray: "5 5" },
];

interface ChartShowcaseProps {
  className?: string;
}

export function EnhancedChartShowcase({ className }: ChartShowcaseProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("bar");

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Charts Showcase</h2>
          <p className="text-gray-500 mt-1">
            Explore our enhanced chart components with improved TypeScript support
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800">New</Badge>
          <Button size="sm" variant="outline" onClick={handleLoadingDemo}>
            Demo Loading
          </Button>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="w-full">
        <div className="flex space-x-1 border-b border-gray-200">
          {[
            { id: "bar", label: "Bar Charts" },
            { id: "line", label: "Line Charts" },
            { id: "mixed", label: "Mixed Charts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {/* Bar Charts Tab */}
          {activeTab === "bar" && (
            <div className="space-y-6">
              {/* Simple Bar Chart */}
              <CardComp>
                <CardHeaderComp>
                  <CardTitleComp>Weekly Performance Overview</CardTitleComp>
                </CardHeaderComp>
                <CardContentComp>
                  <EnhancedBarChart
                    data={performanceData}
                    title="Query Performance"
                    subtitle="Daily query counts and average response times"
                    height={350}
                    showExport={true}
                    isLoading={isLoading}
                    formatValue={(value) => `${value.toLocaleString()}`}
                  />
                </CardContentComp>
              </CardComp>

              {/* Multi-series Bar Chart */}
              <CardComp>
                <CardHeaderComp>
                  <CardTitleComp>Multi-Series Bar Chart</CardTitleComp>
                </CardHeaderComp>
                <CardContentComp>
                  <EnhancedBarChart
                    data={performanceData}
                    bars={barConfigs}
                    height={300}
                    showLegend={true}
                    showExport={true}
                    formatValue={(value) => `${value}`}
                  />
                </CardContentComp>
              </CardComp>

              {/* Storage Distribution */}
              <CardComp>
                <CardHeaderComp>
                  <CardTitleComp>Storage Distribution by Category</CardTitleComp>
                </CardHeaderComp>
                <CardContentComp>
                  <EnhancedBarChart
                    data={storageData}
                    height={300}
                    showExport={true}
                    formatValue={(value) => `${value} GB`}
                  />
                </CardContentComp>
              </CardComp>
            </div>
          )}

          {/* Line Charts Tab */}
          {activeTab === "line" && (
            <div className="space-y-6">
              {/* Growth Trends */}
              <CardComp>
                <CardHeaderComp>
                  <CardTitleComp>Growth Trends Over Time</CardTitleComp>
                </CardHeaderComp>
                <CardContentComp>
                  <EnhancedLineChart
                    data={trendsData}
                    lines={lineConfigs}
                    height={350}
                    showLegend={true}
                    showBrush={true}
                    showExport={true}
                    isLoading={isLoading}
                    formatValue={(value) => `${value.toLocaleString()}`}
                    referenceLines={[
                      { value: 1500, label: "Target Users", color: "#ef4444" },
                    ]}
                  />
                </CardContentComp>
              </CardComp>

              {/* Simple Line Chart */}
              <CardComp>
                <CardHeaderComp>
                  <CardTitleComp>User Activity Timeline</CardTitleComp>
                </CardHeaderComp>
                <CardContentComp>
                  <EnhancedLineChart
                    data={trendsData}
                    lines={[{ key: "users", name: "Active Users", color: "#3B82F6" }]}
                    height={300}
                    showDots={true}
                    showExport={true}
                    formatValue={(value) => `${value.toLocaleString()} users`}
                  />
                </CardContentComp>
              </CardComp>
            </div>
          )}

          {/* Mixed Charts Tab */}
          {activeTab === "mixed" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compact Bar Chart */}
                <CardComp>
                  <CardHeaderComp>
                    <CardTitleComp>Weekly Summary</CardTitleComp>
                  </CardHeaderComp>
                  <CardContentComp>
                    <EnhancedBarChart
                      data={performanceData.slice(0, 4)}
                      height={250}
                      showGrid={false}
                      formatValue={(value) => `${value}`}
                    />
                  </CardContentComp>
                </CardComp>

                {/* Compact Line Chart */}
                <CardComp>
                  <CardHeaderComp>
                    <CardTitleComp>Monthly Growth</CardTitleComp>
                  </CardHeaderComp>
                  <CardContentComp>
                    <EnhancedLineChart
                      data={trendsData.slice(0, 4)}
                      lines={[{ key: "users", name: "Users", color: "#10B981" }]}
                      height={250}
                      showGrid={false}
                      showDots={false}
                      formatValue={(value) => `${value}`}
                    />
                  </CardContentComp>
                </CardComp>
              </div>

              {/* Error State Demo */}
              <CardComp>
                <CardHeaderComp>
                  <CardTitleComp>Error State Demonstration</CardTitleComp>
                </CardHeaderComp>
                <CardContentComp>
                  <EnhancedBarChart
                    data={[]}
                    error="Failed to load chart data. Please try again."
                    height={200}
                  />
                </CardContentComp>
              </CardComp>
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <CardComp className="mt-8">
        <CardHeaderComp>
          <CardTitleComp>Enhanced Features</CardTitleComp>
        </CardHeaderComp>
        <CardContentComp>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">TypeScript Support</h4>
              <p className="text-sm text-gray-600">
                Full TypeScript interfaces with proper type safety
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Loading States</h4>
              <p className="text-sm text-gray-600">
                Built-in loading skeletons and error handling
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Export Features</h4>
              <p className="text-sm text-gray-600">
                Export charts as PNG, SVG, or CSV data
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Custom Formatting</h4>
              <p className="text-sm text-gray-600">
                Flexible value and label formatting options
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Interactive Features</h4>
              <p className="text-sm text-gray-600">
                Brushing, zooming, and reference lines
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Responsive Design</h4>
              <p className="text-sm text-gray-600">
                Automatically adapts to container size
              </p>
            </div>
          </div>
        </CardContentComp>
      </CardComp>
    </div>
  );
}

EnhancedChartShowcase.displayName = "EnhancedChartShowcase";