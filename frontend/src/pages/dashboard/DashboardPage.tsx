import { useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { Database, Code, HardDrive, Pulse } from "@phosphor-icons/react";
import { RecentQueriesWidget } from "@/widgets/dashboard/RecentQueriesWidget";
import { ActivityTimeline } from "@/widgets/dashboard/ActivityTimeline";
import { QuickActions } from "@/widgets/dashboard/QuickActions";
import { MetricsGrid } from "@/widgets/dashboard/MetricsGrid";
import { ChartShowcase } from "@/widgets/charts/ChartShowcase";
import { useDashboardStats, useRecentQueries, useRecentActivity } from "@/shared/hooks/useApi";
import { useSSE } from "@/shared/hooks/useSSE";

export function DashboardPage() {
  const navigate = useNavigate();
  
  // API hooks
  const { data: dashboardStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: recentQueries, isLoading: queriesLoading, refetch: refetchQueries } = useRecentQueries();
  const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useRecentActivity();

  // SSE connection for real-time dashboard updates
  const { connect, disconnect } = useSSE<{
    event_type: 'completed' | 'timeout' | 'failed' | 'database_created' | 'database_deleted';
    transaction_id?: string;
    database_id?: string;
    [key: string]: any;
  }>({
    url: '/api/v1/events/stream',
    onMessage: useCallback((event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Refresh dashboard data when significant events occur
        if (data.event_type === 'completed' || data.event_type === 'database_created' || data.event_type === 'database_deleted') {
          refetchStats();
          refetchQueries();
          refetchActivity();
        }
      } catch (error) {
        console.warn('Failed to parse dashboard SSE message:', error);
      }
    }, [refetchStats, refetchQueries, refetchActivity]),
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  // Connect to SSE when component mounts
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

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

  // Dashboard metrics data with real backend integration
  const metricsData = [
    {
      id: "databases",
      title: "Total Databases",
      value: dashboardStats?.totalDatabases ?? 0,
      icon: <Database className="w-5 h-5" />,
      trend: dashboardStats?.databasesTrend ? { direction: "up" as const, percentage: dashboardStats.databasesTrend } : undefined,
      onClick: () => handleMetricClick("databases"),
    },
    {
      id: "queries",
      title: "Queries Today",
      value: dashboardStats?.queriesToday ?? 0,
      icon: <Code className="w-5 h-5" />,
      trend: dashboardStats?.queriesTodayTrend ? { direction: "up" as const, percentage: dashboardStats.queriesTodayTrend } : undefined,
      onClick: () => handleMetricClick("queries"),
    },
    {
      id: "storage",
      title: "Storage Used",
      value: dashboardStats?.totalStorageGB ? `${dashboardStats.totalStorageGB}GB` : "0GB",
      icon: <HardDrive className="w-5 h-5" />,
      trend: dashboardStats?.storageTrend ? { direction: "up" as const, percentage: dashboardStats.storageTrend } : undefined,
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
