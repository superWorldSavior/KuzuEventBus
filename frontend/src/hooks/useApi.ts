import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

// Dashboard stats query hook
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiService.getDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

// Recent queries hook
export function useRecentQueries(limit = 10) {
  return useQuery({
    queryKey: ["recent-queries", limit],
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
    queryKey: ["recent-activity", limit],
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
    queryKey: ["performance-metrics", timeRange],
    queryFn: () => apiService.getPerformanceMetrics(timeRange),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

// Database list hook
export function useDatabases() {
  return useQuery({
    queryKey: ["databases"],
    queryFn: apiService.getDatabases,
    staleTime: 60000, // Databases don't change as frequently
  });
}

// Individual database hook
export function useDatabase(databaseId: string) {
  return useQuery({
    queryKey: ["database", databaseId],
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
    onSuccess: () => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["recent-queries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
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
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
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