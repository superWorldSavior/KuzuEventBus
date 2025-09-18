import { useNavigate } from "react-router-dom";
import { Database, Code, HardDrive, Pulse } from "@phosphor-icons/react";
import { RecentQueriesWidget } from "@/components/dashboard/RecentQueriesWidget";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { ChartShowcase } from "@/components/charts/ChartShowcase";
import { useDashboardStats, useRecentQueries, useRecentActivity } from "@/hooks/useApi";

export function DashboardPage() {
  const navigate = useNavigate();
  
  // API hooks
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: recentQueries, isLoading: queriesLoading } = useRecentQueries();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();

  const handleMetricClick = (metric: string) => {
    switch (metric) {
      case "databases":
        navigate("/databases");
        break;
      case "queries":
        navigate("/queries");
        break;
      case "storage":
      case "performance":
        navigate("/analytics");
        break;
      default:
        break;
    }
  };

  const handleQueryClick = (queryId: string) => {
    navigate(`/queries/${queryId}`);
  };

  const handleRunQuery = (query: string) => {
    navigate("/queries", { state: { initialQuery: query } });
  };

  // Mock metrics data with proper structure
  const metricsData = [
    {
      id: "databases",
      title: "Total Databases",
      value: dashboardStats?.totalDatabases ?? 8,
      icon: <Database className="w-5 h-5" />,
      trend: { direction: "up" as const, percentage: 12 },
      onClick: () => handleMetricClick("databases"),
    },
    {
      id: "queries",
      title: "Queries Today",
      value: dashboardStats?.queriesToday ?? 143,
      icon: <Code className="w-5 h-5" />,
      trend: { direction: "up" as const, percentage: 8 },
      onClick: () => handleMetricClick("queries"),
    },
    {
      id: "storage",
      title: "Storage Used",
      value: `${dashboardStats?.totalStorageGB ?? 4.2}GB`,
      icon: <HardDrive className="w-5 h-5" />,
      trend: { direction: "up" as const, percentage: 5 },
      onClick: () => handleMetricClick("storage"),
    },
    {
      id: "performance",
      title: "Avg Query Time",
      value: `${dashboardStats?.avgQueryTimeMs ?? 42}ms`,
      icon: <Pulse className="w-5 h-5" />,
      trend: { direction: "down" as const, percentage: 15 },
      onClick: () => handleMetricClick("performance"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your databases today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-3">
          <button
            onClick={() => navigate("/databases/new")}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>New Database</span>
          </button>
          <button
            onClick={() => navigate("/queries")}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Code className="w-4 h-4" />
            <span>Query Builder</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          {statsError && (
            <div className="text-sm text-red-600">
              Failed to load metrics
            </div>
          )}
        </div>
        <MetricsGrid 
          metrics={metricsData}
          isLoading={statsLoading}
        />
      </section>

      {/* Charts Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Performance Analytics</h2>
          <button 
            onClick={() => navigate("/analytics")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed analytics →
          </button>
        </div>
        <ChartShowcase isLoading={statsLoading} />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Queries */}
        <div className="lg:col-span-2">
          <RecentQueriesWidget
            queries={recentQueries}
            isLoading={queriesLoading}
            onQueryClick={handleQueryClick}
            onRunQuery={handleRunQuery}
          />
        </div>

        {/* Activity Timeline */}
        <div>
          <ActivityTimeline 
            activities={recentActivity}
            isLoading={activityLoading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
