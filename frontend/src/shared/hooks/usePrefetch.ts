import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { analyticsApi } from '@/features/analytics';
import { databaseApi } from '@/features/database-management';
import { queryKeys } from './useApi';
import { getOptimalQueryConfig } from './useQueryConfig';

/**
 * Hook for intelligent data prefetching to improve user experience
 * Prefetches likely-to-be-needed data based on user actions and page context
 */
export function usePrefetchOptimization() {
  const queryClient = useQueryClient();

  // Prefetch dashboard data when user is likely to navigate there
  const prefetchDashboardData = useCallback(async () => {
    const hasApiKey = Boolean(localStorage.getItem('kuzu_api_key'));
    const config = getOptimalQueryConfig('analytics', !hasApiKey ? { refetchInterval: 5000 } : {});

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboardStats,
        queryFn: analyticsApi.getDashboardStats,
        staleTime: config.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.recentQueries(5),
        queryFn: () => analyticsApi.getRecentQueries(5),
        staleTime: config.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.recentActivity(10),
        queryFn: () => analyticsApi.getRecentActivity(10),
        staleTime: config.staleTime,
      }),
    ]);
  }, [queryClient]);

  // Prefetch database list when user is likely to view databases
  const prefetchDatabasesList = useCallback(async () => {
    const hasApiKey = Boolean(localStorage.getItem('kuzu_api_key'));
    const config = getOptimalQueryConfig('databases', !hasApiKey ? { refetchInterval: 10000 } : {});

    await queryClient.prefetchQuery({
      queryKey: queryKeys.databases,
      queryFn: databaseApi.getDatabases,
      staleTime: config.staleTime,
    });
  }, [queryClient]);

  // Prefetch specific database details when user hovers or is likely to view
  const prefetchDatabase = useCallback(async (databaseId: string) => {
    const hasApiKey = Boolean(localStorage.getItem('kuzu_api_key'));
    const config = getOptimalQueryConfig('database', !hasApiKey ? { refetchInterval: 15000 } : {});

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.database(databaseId),
        queryFn: () => databaseApi.getDatabase(databaseId),
        staleTime: config.staleTime,
      }),
      queryClient.prefetchQuery({
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
        staleTime: config.staleTime,
      }),
    ]);
  }, [queryClient]);

  // Prefetch analytics data when user navigates to analytics page
  const prefetchAnalyticsData = useCallback(async (timeRange: "1h" | "24h" | "7d" | "30d" = '7d') => {
    const hasApiKey = Boolean(localStorage.getItem('kuzu_api_key'));
    const config = getOptimalQueryConfig('analytics', !hasApiKey ? { refetchInterval: 30000 } : {});

    await queryClient.prefetchQuery({
      queryKey: queryKeys.performanceMetrics(timeRange),
      queryFn: () => analyticsApi.getPerformanceMetrics(timeRange),
      staleTime: config.staleTime,
    });
  }, [queryClient]);

  // Smart prefetching based on current page and user behavior
  const prefetchForCurrentPage = useCallback((page: string, context?: any) => {
    switch (page) {
      case 'dashboard':
        prefetchDashboardData();
        break;
      case 'databases':
        prefetchDatabasesList();
        break;
      case 'database':
        if (context?.databaseId) {
          prefetchDatabase(context.databaseId);
        }
        break;
      case 'analytics':
        prefetchAnalyticsData(context?.timeRange);
        break;
      case 'queries':
        prefetchDatabasesList(); // Likely to need database list for query execution
        break;
      default:
        // Default prefetch - dashboard data is most commonly needed
        prefetchDashboardData();
    }
  }, [prefetchDashboardData, prefetchDatabasesList, prefetchDatabase, prefetchAnalyticsData]);

  // Background prefetching during idle time
  const prefetchInBackground = useCallback(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleBackgroundWork = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 5000 });
      } else {
        setTimeout(callback, 100);
      }
    };

    scheduleBackgroundWork(() => {
      // Prefetch commonly needed data in the background
      prefetchDashboardData();
      prefetchDatabasesList();
    });
  }, [prefetchDashboardData, prefetchDatabasesList]);

  // Invalidate related queries after mutations
  const invalidateRelatedQueries = useCallback((mutationType: string, context?: any) => {
    switch (mutationType) {
      case 'createDatabase':
      case 'deleteDatabase':
        queryClient.invalidateQueries({ queryKey: queryKeys.databases });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        break;
      case 'runQuery':
        if (context?.databaseId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.databaseMetrics(context.databaseId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.recentQueries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() });
        break;
      case 'updateDatabase':
        if (context?.databaseId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.database(context.databaseId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.databases });
        break;
      default:
        // Default: invalidate dashboard stats as they're most commonly affected
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    }
  }, [queryClient]);

  // Utility to warm up cache with essential data
  const warmUpCache = useCallback(async () => {
    await Promise.allSettled([
      prefetchDashboardData(),
      prefetchDatabasesList(),
    ]);
  }, [prefetchDashboardData, prefetchDatabasesList]);

  return {
    prefetchDashboardData,
    prefetchDatabasesList,
    prefetchDatabase,
    prefetchAnalyticsData,
    prefetchForCurrentPage,
    prefetchInBackground,
    invalidateRelatedQueries,
    warmUpCache,
  };
}

/**
 * Hook for hover-based prefetching to improve perceived performance
 * Prefetches data when user hovers over navigation links or database cards
 */
export function useHoverPrefetch() {
  const { prefetchForCurrentPage, prefetchDatabase } = usePrefetchOptimization();

  const handleNavHover = useCallback((route: string) => {
    const routeToPageMap: Record<string, string> = {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/databases': 'databases',
      '/queries': 'queries',
      '/analytics': 'analytics',
      '/search': 'search',
    };

    const page = routeToPageMap[route] || 'dashboard';
    prefetchForCurrentPage(page);
  }, [prefetchForCurrentPage]);

  const handleDatabaseHover = useCallback((databaseId: string) => {
    prefetchDatabase(databaseId);
  }, [prefetchDatabase]);

  return {
    handleNavHover,
    handleDatabaseHover,
  };
}