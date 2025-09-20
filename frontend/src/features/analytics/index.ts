// Analytics feature - barrel export

// Export API services
export { analyticsApi, AnalyticsAPI } from "./services/analyticsApi";

// Export hooks
export {
  useDashboardStats,
  useRecentQueries,
  useRecentActivity,
  usePerformanceMetrics,
  useResourceMetrics,
  useDatabaseAnalytics,
  useUserAnalytics,
  useDashboardOverview,
  useAnalyticsOverview,
  analyticsKeys
} from "./hooks/useAnalytics";