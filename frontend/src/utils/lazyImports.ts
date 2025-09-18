import { lazy, LazyExoticComponent, ComponentType } from 'react';

/**
 * Enhanced lazy loading with retry logic and loading states
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName?: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const startTime = performance.now();
        const component = await componentImport();
        const loadTime = performance.now() - startTime;

        // Log performance metrics
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Loaded ${componentName || 'component'} in ${loadTime.toFixed(2)}ms (attempt ${attempt})`);
        }

        // Report slow loading in production
        if (loadTime > 3000) {
          console.warn(`Slow component load: ${componentName || 'component'} took ${loadTime.toFixed(2)}ms`);
        }

        return component;
      } catch (error) {
        console.error(`Failed to load ${componentName || 'component'} (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Failed to load ${componentName || 'component'} after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }

    throw new Error('Unexpected error in lazy loading');
  });
}

// Page-level lazy imports
export const DashboardPage = lazyWithRetry(
  () => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })),
  'DashboardPage'
);

export const DatabasesPage = lazyWithRetry(
  () => import('@/pages/databases/DatabasesPage').then(m => ({ default: m.DatabasesPage })),
  'DatabasesPage'
);

export const QueriesPage = lazyWithRetry(
  () => import('@/pages/queries/QueriesPage').then(m => ({ default: m.QueriesPage })),
  'QueriesPage'
);

export const SearchPage = lazyWithRetry(
  () => import('@/pages/search/SearchPage').then(m => ({ default: m.SearchPage })),
  'SearchPage'
);

export const NetworkVisualizationPage = lazyWithRetry(
  () => import('@/pages/visualizations/NetworkVisualizationPage').then(m => ({ default: m.NetworkVisualizationPage })),
  'NetworkVisualizationPage'
);

export const AnalyticsPage = lazyWithRetry(
  () => import('@/pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })),
  'AnalyticsPage'
);

export const SettingsPage = lazyWithRetry(
  () => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })),
  'SettingsPage'
);

export const LoginPage = lazyWithRetry(
  () => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })),
  'LoginPage'
);

export const RegisterPage = lazyWithRetry(
  () => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })),
  'RegisterPage'
);

// Component-level lazy imports for heavy components
export const CypherEditor = lazyWithRetry(
  () => import('@/components/queries/CypherEditor').then(m => ({ default: m.CypherEditor })),
  'CypherEditor'
);

export const NetworkDiagram = lazyWithRetry(
  () => import('@/components/visualizations/NetworkDiagram').then(m => ({ default: m.NetworkDiagram })),
  'NetworkDiagram'
);

export const QueryCanvas = lazyWithRetry(
  () => import('@/components/query-builder/QueryCanvas').then(m => ({ default: m.QueryCanvas })),
  'QueryCanvas'
);

export const AdvancedSearch = lazyWithRetry(
  () => import('@/components/search/AdvancedSearch').then(m => ({ default: m.AdvancedSearch })),
  'AdvancedSearch'
);

// Hook for preloading components
export function usePreloadComponents() {
  const preloadComponent = (componentImport: () => Promise<any>) => {
    // Preload on next tick to avoid blocking initial render
    setTimeout(() => {
      componentImport().catch(error => {
        console.warn('Failed to preload component:', error);
      });
    }, 0);
  };

  const preloadPages = () => {
    // Preload commonly accessed pages
    preloadComponent(() => import('@/pages/databases/DatabasesPage'));
    preloadComponent(() => import('@/pages/queries/QueriesPage'));
  };

  const preloadComponents = () => {
    // Preload heavy components that might be used
    preloadComponent(() => import('@/components/queries/CypherEditor'));
    preloadComponent(() => import('@/components/visualizations/NetworkDiagram'));
  };

  return {
    preloadPages,
    preloadComponents,
    preloadComponent,
  };
}

// Route-based code splitting configuration
export const routeConfig = [
  {
    path: '/',
    component: DashboardPage,
    preload: ['databases', 'queries'],
  },
  {
    path: '/databases',
    component: DatabasesPage,
    preload: ['queries', 'visualizations'],
  },
  {
    path: '/queries',
    component: QueriesPage,
    preload: ['databases', 'visualizations'],
  },
  {
    path: '/search',
    component: SearchPage,
    preload: ['queries'],
  },
  {
    path: '/visualizations',
    component: NetworkVisualizationPage,
    preload: ['queries'],
  },
  {
    path: '/analytics',
    component: AnalyticsPage,
    preload: ['visualizations'],
  },
  {
    path: '/settings',
    component: SettingsPage,
    preload: [],
  },
  {
    path: '/login',
    component: LoginPage,
    preload: [],
  },
  {
    path: '/register',
    component: RegisterPage,
    preload: [],
  },
] as const;