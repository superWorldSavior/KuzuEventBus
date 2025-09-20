// Query execution React Query hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryApi } from "../services/queryApi";
import type { Query } from "@/entities/query";

// Query keys
export const queryKeys = {
  all: ["queries"] as const,
  history: (databaseId: string) => ["queries", "history", databaseId] as const,
  status: (transactionId: string) => ["queries", "status", transactionId] as const,
  results: (transactionId: string) => ["queries", "results", transactionId] as const,
  statistics: (databaseId: string, timeframe: string) => ["queries", "statistics", databaseId, timeframe] as const,
  templates: () => ["queries", "templates"] as const,
  plan: (query: string, databaseId: string) => ["queries", "plan", databaseId, query] as const,
  validation: (query: string) => ["queries", "validation", query] as const,
};

/**
 * Hook to submit a query for execution
 */
export function useSubmitQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      databaseId: string;
      query: string;
      parameters?: Record<string, unknown>;
      timeout_seconds?: number;
      priority?: number;
    }) => {
      return queryApi.submitQuery(params.databaseId, {
        query: params.query,
        parameters: params.parameters,
        timeout_seconds: params.timeout_seconds,
        priority: params.priority,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate query history to show the new query
      queryClient.invalidateQueries({
        queryKey: queryKeys.history(variables.databaseId)
      });
      
      // Invalidate query statistics
      queryClient.invalidateQueries({
        queryKey: queryKeys.statistics(variables.databaseId, "24h")
      });
    }
  });
}

/**
 * Hook to get query execution status
 */
export function useQueryStatus(transactionId: string | null, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: queryKeys.status(transactionId || ""),
    queryFn: () => queryApi.getQueryStatus(transactionId!),
    enabled: !!transactionId && options?.enabled !== false,
    refetchInterval: options?.refetchInterval || 1000, // Poll every second by default
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to get query results
 */
export function useQueryResults(transactionId: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.results(transactionId || ""),
    queryFn: () => queryApi.getQueryResults(transactionId!),
    enabled: !!transactionId && options?.enabled !== false,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to cancel a running query
 */
export function useCancelQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => queryApi.cancelQuery(transactionId),
    onSuccess: (_, transactionId) => {
      // Invalidate the status query to reflect the cancellation
      queryClient.invalidateQueries({
        queryKey: queryKeys.status(transactionId)
      });
    }
  });
}

/**
 * Hook to get query history for a database
 */
export function useQueryHistory(databaseId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.history(databaseId),
    queryFn: () => queryApi.getQueryHistory(databaseId, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!databaseId,
  });
}

/**
 * Hook to get query execution statistics
 */
export function useQueryStatistics(databaseId: string, timeframe: "1h" | "24h" | "7d" | "30d" = "24h") {
  return useQuery({
    queryKey: queryKeys.statistics(databaseId, timeframe),
    queryFn: () => queryApi.getQueryStatistics(databaseId, timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!databaseId,
  });
}

/**
 * Hook to validate query syntax
 */
export function useQueryValidation(query: string, databaseId?: string, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.validation(query),
    queryFn: () => queryApi.validateQuery(query, databaseId),
    enabled: !!query && query.trim().length > 0 && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry validation failures
  });
}

/**
 * Hook to get query execution plan
 */
export function useQueryPlan(query: string, databaseId: string, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.plan(query, databaseId),
    queryFn: () => queryApi.getQueryPlan(query, databaseId),
    enabled: !!query && !!databaseId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to save a query template
 */
export function useSaveQueryTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      query: string;
      description?: string;
      parameters?: Record<string, { type: string; default?: unknown; description?: string }>;
      databaseId?: string;
    }) => queryApi.saveQueryTemplate(data),
    onSuccess: () => {
      // Invalidate templates list
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates()
      });
    }
  });
}

/**
 * Hook to get saved query templates
 */
export function useQueryTemplates(databaseId?: string) {
  return useQuery({
    queryKey: queryKeys.templates(),
    queryFn: () => queryApi.getQueryTemplates(databaseId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Combined hook for query execution workflow
 * Handles the complete flow: submit → monitor status → get results
 */
export function useQueryExecution() {
  const submitQuery = useSubmitQuery();
  const cancelQuery = useCancelQuery();
  
  return {
    // Submit a query and get transaction ID
    submit: submitQuery.mutate,
    submitAsync: submitQuery.mutateAsync,
    
    // Cancel a running query
    cancel: cancelQuery.mutate,
    cancelAsync: cancelQuery.mutateAsync,
    
    // Current submission state
    isSubmitting: submitQuery.isPending,
    isCancelling: cancelQuery.isPending,
    
    // Errors
    submitError: submitQuery.error,
    cancelError: cancelQuery.error,
    
    // Reset states
    resetSubmit: submitQuery.reset,
    resetCancel: cancelQuery.reset,
  };
}

/**
 * Hook for managing query history with operations
 */
export function useQueryHistoryOperations(databaseId: string) {
  const queryClient = useQueryClient();
  const { data: history = [], ...query } = useQueryHistory(databaseId);
  
  const refreshHistory = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.history(databaseId)
    });
  };
  
  const clearHistory = async () => {
    // In a real implementation, this would call an API to clear history
    // For now, just invalidate the cache
    queryClient.removeQueries({
      queryKey: queryKeys.history(databaseId)
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.history(databaseId)
    });
  };
  
  const getQueryById = (queryId: string): Query | undefined => {
    return history.find(q => q.id === queryId);
  };
  
  const getRecentQueries = (limit = 10): Query[] => {
    return history
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  };
  
  const getFailedQueries = (): Query[] => {
    return history.filter(q => q.status === "failed");
  };
  
  const getCompletedQueries = (): Query[] => {
    return history.filter(q => q.status === "completed");
  };
  
  return {
    ...query,
    queries: history,
    
    // Operations
    refreshHistory,
    clearHistory,
    getQueryById,
    getRecentQueries,
    getFailedQueries,
    getCompletedQueries,
    
    // Statistics
    totalQueries: history.length,
    completedCount: getCompletedQueries().length,
    failedCount: getFailedQueries().length,
    successRate: history.length > 0 ? (getCompletedQueries().length / history.length) * 100 : 0,
  };
}