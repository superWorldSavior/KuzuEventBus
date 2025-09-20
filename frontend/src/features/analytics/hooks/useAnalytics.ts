// Analytics React Query hooks
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../services/analyticsApi";

// Query keys
export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboardStats: () => ["analytics", "dashboard-stats"] as const,
  recentQueries: (limit: number) => ["analytics", "recent-queries", limit] as const,
  recentActivity: (limit: number) => ["analytics", "recent-activity", limit] as const,
  performance: (timeRange: string) => ["analytics", "performance", timeRange] as const,
  resources: (timeRange: string) => ["analytics", "resources", timeRange] as const,
  databases: (timeRange: string) => ["analytics", "databases", timeRange] as const,
  users: (timeRange: string) => ["analytics", "users", timeRange] as const,
};

/**
 * Hook to get dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: analyticsKeys.dashboardStats(),
    queryFn: () => analyticsApi.getDashboardStats(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get recent queries across all databases
 */
export function useRecentQueries(limit = 10) {
  return useQuery({
    queryKey: analyticsKeys.recentQueries(limit),
    queryFn: () => analyticsApi.getRecentQueries(limit),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get recent activity across the platform
 */
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: analyticsKeys.recentActivity(limit),
    queryFn: () => analyticsApi.getRecentActivity(limit),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get performance metrics over time
 */
export function usePerformanceMetrics(timeRange: "1h" | "24h" | "7d" | "30d" = "7d") {
  return useQuery({
    queryKey: analyticsKeys.performance(timeRange),
    queryFn: () => analyticsApi.getPerformanceMetrics(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get system resource usage metrics
 */
export function useResourceMetrics(timeRange: "1h" | "24h" | "7d" | "30d" = "24h") {
  return useQuery({
    queryKey: analyticsKeys.resources(timeRange),
    queryFn: () => analyticsApi.getResourceMetrics(timeRange),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get database usage analytics
 */
export function useDatabaseAnalytics(timeRange: "7d" | "30d" | "90d" = "30d") {
  return useQuery({
    queryKey: analyticsKeys.databases(timeRange),
    queryFn: () => analyticsApi.getDatabaseAnalytics(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get user activity analytics
 */
export function useUserAnalytics(timeRange: "7d" | "30d" | "90d" = "30d") {
  return useQuery({
    queryKey: analyticsKeys.users(timeRange),
    queryFn: () => analyticsApi.getUserAnalytics(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Combined hook for dashboard overview data
 */
export function useDashboardOverview() {
  const dashboardStats = useDashboardStats();
  const recentQueries = useRecentQueries(5);
  const recentActivity = useRecentActivity(10);
  const performanceMetrics = usePerformanceMetrics("24h");

  return {
    // Individual query states
    dashboardStats,
    recentQueries,
    recentActivity,
    performanceMetrics,

    // Combined loading state
    isLoading: 
      dashboardStats.isLoading ||
      recentQueries.isLoading ||
      recentActivity.isLoading ||
      performanceMetrics.isLoading,

    // Combined error state
    hasError: 
      dashboardStats.isError ||
      recentQueries.isError ||
      recentActivity.isError ||
      performanceMetrics.isError,

    // Combined data
    data: {
      stats: dashboardStats.data,
      queries: recentQueries.data,
      activity: recentActivity.data,
      performance: performanceMetrics.data,
    },

    // Refetch all data
    refetchAll: () => {
      dashboardStats.refetch();
      recentQueries.refetch();
      recentActivity.refetch();
      performanceMetrics.refetch();
    }
  };
}

/**
 * Combined hook for analytics overview
 */
export function useAnalyticsOverview(timeRange: "7d" | "30d" | "90d" = "30d") {
  const databaseAnalytics = useDatabaseAnalytics(timeRange);
  const userAnalytics = useUserAnalytics(timeRange);
  const resourceMetrics = useResourceMetrics(timeRange === "7d" ? "7d" : "30d");

  return {
    // Individual query states
    databaseAnalytics,
    userAnalytics,
    resourceMetrics,

    // Combined loading state
    isLoading:
      databaseAnalytics.isLoading ||
      userAnalytics.isLoading ||
      resourceMetrics.isLoading,

    // Combined error state
    hasError:
      databaseAnalytics.isError ||
      userAnalytics.isError ||
      resourceMetrics.isError,

    // Combined data
    data: {
      databases: databaseAnalytics.data,
      users: userAnalytics.data,
      resources: resourceMetrics.data,
    },

    // Refetch all data
    refetchAll: () => {
      databaseAnalytics.refetch();
      userAnalytics.refetch();
      resourceMetrics.refetch();
    }
  };
}