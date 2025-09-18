import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

// Query Keys for better cache management
export const queryKeys = {
  dashboardStats: ['dashboard-stats'] as const,
  recentQueries: (limit?: number) => ['recent-queries', limit] as const,
  recentActivity: (limit?: number) => ['recent-activity', limit] as const,
  performanceMetrics: (timeRange: string) => ['performance-metrics', timeRange] as const,
  databases: ['databases'] as const,
  database: (id: string) => ['database', id] as const,
  databaseMetrics: (id: string) => ['database', id, 'metrics'] as const,
  queryExecutions: (databaseId?: string) => ['queryExecutions', databaseId] as const,
  queryExecution: (id: string) => ['queryExecution', id] as const,
} as const;

// Dashboard stats query hook
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: apiService.getDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

// Recent queries hook
export function useRecentQueries(limit = 10) {
  return useQuery({
    queryKey: queryKeys.recentQueries(limit),
    queryFn: () => apiService.getRecentQueries(limit),
    refetchInterval: 10000,
    staleTime: 5000,
    select: (data) => {
      // Transform API data to match component expectations
      return data?.map((item: any) => ({
        id: item.id,
        query: item.query,
        status: item.status === "completed" ? "success" : item.status,
        executionTime: item.executionTime,
        createdAt: item.timestamp, // Transform timestamp to createdAt
        database: item.database,
        resultCount: item.resultCount,
      }));
    },
  });
}

// Recent activity hook
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: queryKeys.recentActivity(limit),
    queryFn: () => apiService.getRecentActivity(limit),
    refetchInterval: 15000,
    staleTime: 10000,
    select: (data) => {
      // Transform API data to match component expectations
      return data?.map((item: any) => ({
        id: item.id,
        type: item.type,
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
export function usePerformanceMetrics(timeRange = "7d") {
  return useQuery({
    queryKey: queryKeys.performanceMetrics(timeRange),
    queryFn: () => apiService.getPerformanceMetrics(timeRange),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

// Database list hook
export function useDatabases() {
  return useQuery({
    queryKey: queryKeys.databases,
    queryFn: apiService.getDatabases,
    staleTime: 60000, // Databases don't change as frequently
  });
}

// Individual database hook
export function useDatabase(databaseId: string) {
  return useQuery({
    queryKey: queryKeys.database(databaseId),
    queryFn: () => apiService.getDatabase(databaseId),
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
      return apiService.submitQuery(databaseId, {
        query,
        parameters,
      });
    },
    onSuccess: (_, variables) => {
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
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => {
      return apiService.createDatabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.databases });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

// Mutation for updating databases
export function useUpdateDatabase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      // For now, we'll use a placeholder since updateDatabase doesn't exist in API
      console.log('Update database not implemented in API service yet');
      return Promise.resolve({ id, ...data });
    },
    onSuccess: (updatedDatabase, variables) => {
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
  
  return useMutation({
    mutationFn: (id: string) => {
      // For now, we'll use a placeholder since deleteDatabase doesn't exist in API
      console.log('Delete database not implemented in API service yet');
      return Promise.resolve(id);
    },
    onSuccess: (_, deletedId) => {
      // Remove database from cache
      queryClient.removeQueries({ queryKey: queryKeys.database(deletedId) });
      queryClient.removeQueries({ queryKey: queryKeys.databaseMetrics(deletedId) });
      // Invalidate databases list
      queryClient.invalidateQueries({ queryKey: queryKeys.databases });
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
      const db = await apiService.getDatabase(databaseId);
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
      queryFn: () => apiService.getDatabase(id),
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
        const db = await apiService.getDatabase(id);
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