import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// DEPRECATED: Use feature-specific hooks instead
import { analyticsApi } from "@/features/analytics";
import { databaseApi } from "@/features/database-management"; 
import { queryApi } from "@/features/query-execution";
import { useApiErrorHandler, isUsingMockData } from "./useApiErrorHandler";
import type { Database, DatabaseCreate, DatabaseUpdate } from "@/entities/database";
import { 
  getOptimalQueryConfig, 
  QUERY_KEY_STRATEGIES, 
  QUERY_OPTIONS 
} from "./useQueryConfig";
import { apiClient } from "@/shared/api/client";

/**
 * @deprecated Use feature-specific hooks instead:
 * - @/features/analytics for dashboard stats, recent queries, performance metrics
 * - @/features/database-management for database CRUD operations  
 * - @/features/query-execution for query submission and results
 * 
 * This hook is maintained for backward compatibility but will be removed in future versions.
 */

// Types for API responses
interface RecentQueryResponse {
  id: string;
  database: string;
  query: string;
  status: string;
  executionTime: number | null;
  timestamp: string;
  resultCount: number | null;
}

interface RecentActivityResponse {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user: string;
  metadata?: Record<string, unknown>;
}

interface UploadFileRequest {
  databaseId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

// Query Keys for better cache management using hierarchical strategy
export const queryKeys = {
  // Root keys
  all: QUERY_KEY_STRATEGIES.hierarchical.root,
  dashboard: QUERY_KEY_STRATEGIES.hierarchical.dashboard,
  databases: QUERY_KEY_STRATEGIES.hierarchical.databases,
  queries: QUERY_KEY_STRATEGIES.hierarchical.queries,
  analytics: QUERY_KEY_STRATEGIES.hierarchical.analytics,
  
  // Specific keys
  dashboardStats: [...QUERY_KEY_STRATEGIES.hierarchical.dashboard, 'stats'] as const,
  recentQueries: (limit?: number) => [...QUERY_KEY_STRATEGIES.hierarchical.queries, 'recent', { limit }] as const,
  recentActivity: (limit?: number) => [...QUERY_KEY_STRATEGIES.hierarchical.dashboard, 'activity', { limit }] as const,
  performanceMetrics: (timeRange: string) => QUERY_KEY_STRATEGIES.parameterized.performanceMetrics(timeRange),
  database: (id: string) => QUERY_KEY_STRATEGIES.parameterized.database(id),
  databaseMetrics: (id: string) => QUERY_KEY_STRATEGIES.parameterized.databaseMetrics(id),
  queryExecutions: (databaseId?: string) => [...QUERY_KEY_STRATEGIES.hierarchical.queries, 'executions', { databaseId }] as const,
  queryExecution: (id: string) => [...QUERY_KEY_STRATEGIES.hierarchical.queries, 'execution', id] as const,
  queryResults: (transactionId: string) => QUERY_KEY_STRATEGIES.parameterized.queryResults(transactionId),
} as const;

// Dashboard stats query hook with optimized configuration
export function useDashboardStats() {
  // Determine if we're likely using mock data by checking localStorage for API key
  const hasApiKey = Boolean(localStorage.getItem('kuzu_api_key'));
  const config = getOptimalQueryConfig('analytics', !hasApiKey ? { refetchInterval: 5000 } : {});
  
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: analyticsApi.getDashboardStats,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnMount: config.refetchOnMount,
    refetchOnReconnect: config.refetchOnReconnect,
    retry: QUERY_OPTIONS.dashboard.retry,
    retryDelay: QUERY_OPTIONS.dashboard.retryDelay,
    networkMode: QUERY_OPTIONS.dashboard.networkMode,
  });
}

// Recent queries hook
export function useRecentQueries(limit = 10) {
  return useQuery({
    queryKey: queryKeys.recentQueries(limit),
    queryFn: () => analyticsApi.getRecentQueries(limit),
    refetchInterval: 10000,
    staleTime: 5000,
    select: (data: RecentQueryResponse[]) => {
      // Transform API data to match component expectations
      return data?.map((item) => ({
        id: item.id,
        query: item.query,
        status: (item.status === "completed" ? "success" : item.status) as "success" | "error" | "running",
        executionTime: item.executionTime || undefined,
        createdAt: item.timestamp, // Transform timestamp to createdAt
        database: item.database,
        resultCount: item.resultCount || undefined,
      }));
    },
  });
}

// Recent activity hook
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: queryKeys.recentActivity(limit),
    queryFn: () => analyticsApi.getRecentActivity(limit),
    refetchInterval: 15000,
    staleTime: 10000,
    select: (data: RecentActivityResponse[]) => {
      // Transform API data to match component expectations
      return data?.map((item) => ({
        id: item.id,
        type: item.type as "database_created" | "database_deleted" | "query_executed" | "query_error" | "user_login" | "file_uploaded",
        title: item.title,
        description: item.description,
        timestamp: item.timestamp, // Keep as string, component will handle parsing
        user: item.user,
        metadata: item.metadata,
      }));
    },
  });
}

// Performance metrics hook
export function usePerformanceMetrics(timeRange: "1h" | "24h" | "7d" | "30d" = "7d") {
  return useQuery({
    queryKey: queryKeys.performanceMetrics(timeRange),
    queryFn: () => analyticsApi.getPerformanceMetrics(timeRange),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

// Database list hook with optimized caching
export function useDatabases() {
  const hasApiKey = Boolean(localStorage.getItem('kuzu_api_key'));
  const config = getOptimalQueryConfig('databases', !hasApiKey ? { refetchInterval: 10000 } : {});
  
  return useQuery<Database[]>({
    queryKey: queryKeys.databases,
    queryFn: databaseApi.getDatabases,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    retry: QUERY_OPTIONS.background.retry,
    retryDelay: QUERY_OPTIONS.background.retryDelay,
  });
}

// Individual database hook
export function useDatabase(databaseId: string) {
  return useQuery<Database>({
    queryKey: queryKeys.database(databaseId),
    queryFn: () => databaseApi.getDatabase(databaseId),
    enabled: !!databaseId,
    staleTime: 30000,
  });
}

// Mutation for running queries
export function useRunQuery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ query, databaseId, parameters }: {
      query: string;
      databaseId: string;
      parameters?: Record<string, unknown>;
    }) => {
      return queryApi.submitQuery(databaseId, {
        query,
        parameters,
      });
    },
    onSuccess: (_: unknown, variables: { query: string; databaseId: string; parameters?: Record<string, unknown> }) => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
      queryClient.invalidateQueries({ queryKey: queryKeys.databaseMetrics(variables.databaseId) });
    },
  });
}

// Mutation for creating databases
export function useCreateDatabase() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  return useMutation<Database, Error, DatabaseCreate>({
    mutationFn: (data: DatabaseCreate) => {
      return databaseApi.createDatabase(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.databases });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      
      // Show success message
      handleSuccess(
        `Database "${variables.name}" has been created successfully.`,
        'Database Created'
      );
    },
    onError: (error, variables) => {
      // Only show error if it's not using mock data (which is expected during development)
      if (!isUsingMockData(error)) {
        handleError(error, `Creating Database "${variables.name}"`);
      }
    },
  });
}

// Mutation for updating databases
export function useUpdateDatabase() {
  const queryClient = useQueryClient();
  
  return useMutation<Database, Error, { id: string; data: DatabaseUpdate }>({
    mutationFn: ({ id, data }: { id: string; data: DatabaseUpdate }) => {
      return databaseApi.updateDatabase(id, data);
    },
    onSuccess: (updatedDatabase: Database, variables: { id: string }) => {
      // Update specific database cache
      queryClient.setQueryData(
        queryKeys.database(variables.id), 
        updatedDatabase
      );
      // Invalidate databases list to reflect changes
      queryClient.invalidateQueries({ queryKey: queryKeys.databases });
    },
  });
}

// Mutation for deleting databases
export function useDeleteDatabase() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: (id: string) => {
      return databaseApi.deleteDatabase(id);
    },
    onSuccess: (_: unknown, deletedId: string) => {
      // Remove database from cache
      queryClient.removeQueries({ queryKey: queryKeys.database(deletedId) });
      queryClient.removeQueries({ queryKey: queryKeys.databaseMetrics(deletedId) });
      // Invalidate databases list
      queryClient.invalidateQueries({ queryKey: queryKeys.databases });
    },
  });
}

// Mutation for uploading files
export function useUploadFile() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean; file_id: string; message: string }, Error, UploadFileRequest>({
    mutationFn: ({ 
      databaseId, 
      file, 
      onProgress 
    }: UploadFileRequest) => {
      return databaseApi.uploadDatabaseFile(databaseId, file, onProgress);
    },
    onSuccess: (_: unknown, variables: UploadFileRequest) => {
      // Invalidate database and related queries after successful upload
      queryClient.invalidateQueries({ queryKey: queryKeys.database(variables.databaseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.databases });
      queryClient.invalidateQueries({ queryKey: queryKeys.databaseMetrics(variables.databaseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

// Enhanced real-time hooks
export function useRealTimeDashboard() {
  const dashboardStats = useDashboardStats();
  const recentQueries = useRecentQueries(5);
  const recentActivity = useRecentActivity(10);
  const performanceMetrics = usePerformanceMetrics('24h');
  
  return {
    stats: dashboardStats,
    queries: recentQueries,
    activity: recentActivity,
    metrics: performanceMetrics,
    isLoading: dashboardStats.isLoading || recentQueries.isLoading || 
              recentActivity.isLoading || performanceMetrics.isLoading,
    error: dashboardStats.error || recentQueries.error || 
           recentActivity.error || performanceMetrics.error,
  };
}

// Database metrics hook with real-time updates
export function useDatabaseMetrics(databaseId: string, realTime = false) {
  return useQuery({
    queryKey: queryKeys.databaseMetrics(databaseId),
    queryFn: async () => {
      // Simulate database metrics since API doesn't have this endpoint yet
      const db = await databaseApi.getDatabase(databaseId);
      return {
        id: databaseId,
        name: db.name,
        health: 'healthy' as const,
        performance: {
          queryCount: Math.floor(Math.random() * 1000),
          avgResponseTime: Math.floor(Math.random() * 500) + 50,
          activeConnections: Math.floor(Math.random() * 20),
          memoryUsage: Math.floor(Math.random() * 80) + 20,
        },
        storage: {
          size: Math.floor(Math.random() * 10000) + 1000,
          available: Math.floor(Math.random() * 5000) + 5000,
          growth: Math.floor(Math.random() * 100) + 10,
        },
        lastUpdated: new Date().toISOString(),
      };
    },
    enabled: !!databaseId,
    refetchInterval: realTime ? 10000 : 60000, // 10s for real-time, 1min for normal
    staleTime: realTime ? 5000 : 30000,
  });
}

// Query execution tracking hook
export function useQueryExecutions(databaseId?: string, realTime = false) {
  return useQuery({
    queryKey: queryKeys.queryExecutions(databaseId),
    queryFn: async () => {
      // Simulate query executions since API doesn't have this endpoint yet
      const executions = Array.from({ length: 5 }, (_, i) => ({
        id: `exec-${i + 1}`,
        query: `SELECT * FROM table_${i + 1} LIMIT 100`,
        status: ['running', 'completed', 'failed'][Math.floor(Math.random() * 3)] as 'running' | 'completed' | 'failed',
        startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        duration: Math.floor(Math.random() * 5000) + 100,
        database: databaseId || `db-${i + 1}`,
        resultCount: Math.floor(Math.random() * 10000),
      }));
      return executions;
    },
    refetchInterval: realTime ? 3000 : 30000, // 3s for real-time, 30s for normal
    staleTime: realTime ? 1000 : 15000,
  });
}

// Prefetch utilities for better UX
export function usePrefetchDatabase() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.database(id),
      queryFn: () => databaseApi.getDatabase(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}

export function usePrefetchDatabaseMetrics() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.databaseMetrics(id),
      queryFn: async () => {
        const db = await databaseApi.getDatabase(id);
        return {
          id,
          name: db.name,
          health: 'healthy' as const,
          performance: {
            queryCount: Math.floor(Math.random() * 1000),
            avgResponseTime: Math.floor(Math.random() * 500) + 50,
            activeConnections: Math.floor(Math.random() * 20),
            memoryUsage: Math.floor(Math.random() * 80) + 20,
          },
          storage: {
            size: Math.floor(Math.random() * 10000) + 1000,
            available: Math.floor(Math.random() * 5000) + 5000,
            growth: Math.floor(Math.random() * 100) + 10,
          },
          lastUpdated: new Date().toISOString(),
        };
      },
      staleTime: 30 * 1000,
    });
  };
}

// Hook for error handling and retry logic
export function useApiError() {
  const handleError = (error: any) => {
    console.error("API Error:", error);
    
    if (error?.response?.status >= 500) {
      return "Server error occurred. Please try again later.";
    } else if (error?.response?.status === 401) {
      return "Authentication required. Please log in.";
    } else if (error?.response?.status === 403) {
      return "You don't have permission to perform this action.";
    } else {
      return error?.message || "An unexpected error occurred.";
    }
  };

  return { handleError };
}

// Snapshots and PITR hooks
export function useDatabaseSnapshots(databaseId: string) {
  return useQuery({
    queryKey: ['database-snapshots', databaseId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/snapshots`);
      return response.data.snapshots || [];
    },
    enabled: !!databaseId,
    staleTime: 30000,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (databaseId: string) => {
      const response = await apiClient.post(`/api/v1/databases/${databaseId}/snapshots`);
      return response.data;
    },
    onSuccess: (_, databaseId) => {
      queryClient.invalidateQueries({ queryKey: ['database-snapshots', databaseId] });
    },
  });
}

export function useRestoreSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ databaseId, snapshotId }: { databaseId: string; snapshotId: string }) => {
      const response = await apiClient.post(`/api/v1/databases/${databaseId}/restore`, {
        snapshot_id: snapshotId,
      });
      return response.data;
    },
    onSuccess: (_, { databaseId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.database(databaseId) });
      queryClient.invalidateQueries({ queryKey: ['database-snapshots', databaseId] });
    },
  });
}

export function useRestorePITR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ databaseId, targetTimestamp }: { databaseId: string; targetTimestamp: string }) => {
      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/restore-pitr?target_timestamp=${encodeURIComponent(targetTimestamp)}`
      );
      return response.data;
    },
    onSuccess: (_, { databaseId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.database(databaseId) });
      queryClient.invalidateQueries({ queryKey: ['database-snapshots', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['database-pitr', databaseId] });
    },
  });
}

// PITR timeline hook
export function useDatabasePitr(
  databaseId: string,
  params?: { start?: string; end?: string; window?: 'minute' | 'hour'; include_types?: boolean }
) {
  return useQuery({
    queryKey: ['database-pitr', databaseId, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.start) qs.set('start', params.start);
      if (params?.end) qs.set('end', params.end);
      if (params?.window) qs.set('window', params.window);
      if (params?.include_types !== undefined) qs.set('include_types', String(params.include_types));
      const url = `/api/v1/databases/${databaseId}/pitr${qs.toString() ? `?${qs.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: !!databaseId,
    staleTime: 30000,
  });
}
