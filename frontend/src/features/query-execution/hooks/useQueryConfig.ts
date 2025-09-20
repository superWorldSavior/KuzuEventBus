// Optimized query configuration for better performance and caching
// Provides intelligent refetch intervals, stale time management, and cache optimization

export interface QueryConfig {
  staleTime: number;
  gcTime: number; // Updated from cacheTime in newer React Query versions
  refetchInterval?: number | false;
  refetchOnWindowFocus: boolean;
  refetchOnMount: boolean;
  refetchOnReconnect: boolean;
}

// Different data types have different freshness requirements
export const QUERY_CONFIGS = {
  // Real-time data - needs frequent updates
  realTime: {
    staleTime: 1000, // 1 second
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 3000, // 3 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  } as QueryConfig,

  // Live data - moderate updates
  live: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  } as QueryConfig,

  // Dynamic data - occasional updates
  dynamic: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: false, // No automatic refetch
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchOnReconnect: true,
  } as QueryConfig,

  // Static data - rarely changes
  static: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  } as QueryConfig,

  // Development mode - using mock data
  mock: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  } as QueryConfig,
} as const;

// Smart config selector based on endpoint status
export function getOptimalQueryConfig(
  defaultType: keyof typeof QUERY_CONFIGS,
  isUsingMockData = false,
  isRealTimeEnabled = false
): QueryConfig {
  // Use mock config when using mock data
  if (isUsingMockData) {
    return QUERY_CONFIGS.mock;
  }
  
  // Use real-time config when explicitly requested and not using mock data
  if (isRealTimeEnabled && !isUsingMockData) {
    return QUERY_CONFIGS.realTime;
  }
  
  return QUERY_CONFIGS[defaultType];
}

// Query key strategies for better cache management
export const QUERY_KEY_STRATEGIES = {
  // Hierarchical keys for automatic invalidation
  hierarchical: {
    root: ['api'] as const,
    dashboard: ['api', 'dashboard'] as const,
    databases: ['api', 'databases'] as const,
    queries: ['api', 'queries'] as const,
    analytics: ['api', 'analytics'] as const,
  },
  
  // Parameterized keys for specific queries
  parameterized: {
    database: (id: string) => ['api', 'databases', id] as const,
    databaseMetrics: (id: string) => ['api', 'databases', id, 'metrics'] as const,
    queryResults: (transactionId: string) => ['api', 'queries', transactionId, 'results'] as const,
    performanceMetrics: (timeRange: string) => ['api', 'analytics', 'performance', timeRange] as const,
  },
  
  // List keys with pagination support
  paginated: {
    recentQueries: (limit?: number, offset?: number) => 
      ['api', 'queries', 'recent', { limit, offset }] as const,
    recentActivity: (limit?: number, offset?: number) => 
      ['api', 'activity', 'recent', { limit, offset }] as const,
  },
};

// Advanced query options for specific use cases
export const QUERY_OPTIONS = {
  // For dashboard - balance freshness with performance
  dashboard: {
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    networkMode: 'online' as const,
  },
  
  // For real-time features - be aggressive about updates
  realTime: {
    retry: 1,
    retryDelay: 1000,
    networkMode: 'always' as const,
  },
  
  // For background data - be conservative
  background: {
    retry: 2,
    retryDelay: 5000,
    networkMode: 'online' as const,
  },
  
  // For user-initiated actions - provide immediate feedback
  userAction: {
    retry: 3,
    retryDelay: 2000,
    networkMode: 'online' as const,
  },
} as const;

// Intelligent prefetching strategies
export const PREFETCH_STRATEGIES = {
  // Prefetch related data when user navigates
  onPageLoad: {
    databases: ['dashboard-stats', 'recent-activity'],
    database: ['database-metrics', 'recent-queries'],
    queries: ['databases', 'query-history'],
  },
  
  // Prefetch likely next actions
  onUserAction: {
    createDatabase: ['databases'],
    runQuery: ['query-status', 'database-metrics'],
    deleteDatabase: ['dashboard-stats'],
  },
  
  // Background prefetching for better UX
  onIdle: {
    dashboard: ['performance-metrics'],
    database: ['schema'],
  },
} as const;

// Cache size management
export const CACHE_MANAGEMENT = {
  maxQueries: 50, // Maximum number of queries to keep in cache
  maxAge: 60 * 60 * 1000, // 1 hour maximum age for any cached data
  gcInterval: 5 * 60 * 1000, // Garbage collect every 5 minutes
  
  // Priority-based eviction (higher number = higher priority)
  priorities: {
    'dashboard-stats': 10,
    'databases': 9,
    'recent-queries': 8,
    'recent-activity': 7,
    'performance-metrics': 6,
    'database-details': 5,
    'query-results': 4,
  } as const,
};

// Development mode optimizations
export const DEV_OPTIMIZATIONS = {
  // Reduce refetch intervals when using mock data
  mockDataRefetchMultiplier: 0.1, // 10x slower refreshes for mock data
  
  // Enable more aggressive caching in development
  devCacheMultiplier: 2, // 2x longer cache times in development
  
  // Disable background refetching in development
  disableBackgroundRefetch: import.meta.env.MODE === 'development',
  
  // Enable query devtools in development
  enableDevtools: import.meta.env.MODE === 'development',
} as const;