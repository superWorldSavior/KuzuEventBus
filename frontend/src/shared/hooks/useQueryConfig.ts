// Query configuration utilities for React Query optimization
import type { UseQueryOptions, QueryKey } from '@tanstack/react-query';

export interface QueryKeyStrategy {
  prefix: string;
  generateKey: (...args: any[]) => QueryKey;
  optimizationRules?: {
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
  };
}

export const QUERY_KEY_STRATEGIES = {
  databases: {
    prefix: 'databases',
    generateKey: (filters?: any) => ['databases', filters],
    optimizationRules: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
  database: {
    prefix: 'database',
    generateKey: (id: string) => ['database', id],
    optimizationRules: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
  queries: {
    prefix: 'queries',
    generateKey: (filters?: any) => ['queries', filters],
    optimizationRules: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
  analytics: {
    prefix: 'analytics',
    generateKey: (type: string, params?: any) => ['analytics', type, params],
    optimizationRules: {
      staleTime: 1 * 60 * 1000, // 1 minute
      gcTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
  // Hierarchical key strategies for complex nested caching
  hierarchical: {
    root: ['kuzu'] as const,
    dashboard: ['kuzu', 'dashboard'] as const,
    databases: ['kuzu', 'databases'] as const,
    queries: ['kuzu', 'queries'] as const,
    analytics: ['kuzu', 'analytics'] as const,
  },
  // Parameterized key strategies for dynamic data
  parameterized: {
    performanceMetrics: (timeRange: string) => ['kuzu', 'analytics', 'performance', timeRange] as const,
    database: (id: string) => ['kuzu', 'database', id] as const,
    databaseMetrics: (id: string) => ['kuzu', 'database', id, 'metrics'] as const,
    queryResults: (transactionId: string) => ['kuzu', 'query', 'results', transactionId] as const,
  },
} as const;

export const QUERY_OPTIONS = {
  DEFAULT: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  FAST_REFRESH: {
    staleTime: 0,
    gcTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30 * 1000,
  },
  SLOW_REFRESH: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  },
  dashboard: {
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 15000),
    networkMode: 'online' as const,
  },
  background: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(2000 * 2 ** attemptIndex, 30000),
  },
} as const;

/**
 * Get optimal query configuration based on data type and context
 */
export function getOptimalQueryConfig<T = any>(
  dataType: 'databases' | 'database' | 'queries' | 'analytics' | 'default' = 'default',
  overrides?: Partial<UseQueryOptions<T>>
): UseQueryOptions<T> {
  const baseConfig = dataType === 'default' 
    ? QUERY_OPTIONS.DEFAULT 
    : { 
        ...QUERY_OPTIONS.DEFAULT, 
        ...(QUERY_KEY_STRATEGIES[dataType] && 'optimizationRules' in QUERY_KEY_STRATEGIES[dataType] 
            ? QUERY_KEY_STRATEGIES[dataType].optimizationRules 
            : {})
      };

  return {
    ...baseConfig,
    ...overrides,
  } as UseQueryOptions<T>;
}

/**
 * Generate optimized query key for consistent caching
 */
export function generateQueryKey(
  strategy: 'databases' | 'database' | 'queries' | 'analytics',
  arg1?: any,
  arg2?: any
): QueryKey {
  const strategyConfig = QUERY_KEY_STRATEGIES[strategy];
  if ('generateKey' in strategyConfig && typeof strategyConfig.generateKey === 'function') {
    if (strategy === 'database' && arg1 !== undefined) {
      return strategyConfig.generateKey(arg1);
    } else if (strategy === 'analytics' && arg1 !== undefined) {
      return strategyConfig.generateKey(arg1, arg2);
    } else {
      return strategyConfig.generateKey(arg1);
    }
  }
  const args = [arg1, arg2].filter(arg => arg !== undefined);
  return [strategy, ...args];
}