import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";

// Default loading fallback
const DefaultFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="lg" variant="spin" />
  </div>
);

// Page-level loading fallback with full height
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <LoadingSpinner size="xl" variant="spin" color="primary" />
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * Creates a lazy wrapper with enhanced loading states and error handling
 */
export function createLazyWrapper(
  Component: React.ComponentType<any>,
  fallback: React.ReactNode = <DefaultFallback />
) {
  return (props: any) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
}

// Simple lazy components using React.lazy with proper typing
export const LazyDashboardPage = lazy(() => 
  import('@/pages/dashboard/DashboardPage').then(module => ({ default: module.DashboardPage }))
);

export const LazyDatabasesPage = lazy(() => 
  import('@/pages/databases/DatabasesPage').then(module => ({ default: module.DatabasesPage }))
);

export const LazyQueriesPage = lazy(() => 
  import('@/pages/queries/QueriesPage').then(module => ({ default: module.QueriesPage }))
);

export const LazyAnalyticsPage = lazy(() => 
  import('@/pages/analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage }))
);

export const LazySettingsPage = lazy(() => 
  import('@/pages/settings/SettingsPage').then(module => ({ default: module.SettingsPage }))
);

export const LazySearchPage = lazy(() => 
  import('@/pages/search/SearchPage').then(module => ({ default: module.SearchPage }))
);

export const LazyNetworkVisualizationPage = lazy(() => 
  import('@/pages/visualizations/NetworkVisualizationPage').then(module => ({ default: module.NetworkVisualizationPage }))
);

export const LazyVisualQueryBuilderPage = lazy(() => 
  import('@/pages/queries/VisualQueryBuilderPage').then(module => ({ default: module.VisualQueryBuilderPage }))
);

// Special handling for auth pages that use named exports
export const LazyLoginPage = lazy(() => 
  import('@/pages/auth/LoginPage').then(module => ({ default: module.LoginPage }))
);

// Heavy component lazy loading
export const LazyMonacoEditor = lazy(() => import('@monaco-editor/react'));

// Lazy wrapper components with enhanced loading states
export const LazyPageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageFallback />}>
    {children}
  </Suspense>
);

export const LazyChartWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
      <div className="text-center space-y-2">
        <LoadingSpinner size="md" variant="dots" />
        <p className="text-xs text-gray-500">Loading chart...</p>
      </div>
    </div>
  }>
    {children}
  </Suspense>
);

export const LazyEditorWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
      <div className="text-center space-y-3">
        <LoadingSpinner size="lg" variant="bars" />
        <p className="text-sm text-gray-600">Loading editor...</p>
      </div>
    </div>
  }>
    {children}
  </Suspense>
);

// Preload critical routes
export function preloadCriticalRoutes() {
  // Preload dashboard since it's the main landing page after auth
  import('@/pages/dashboard/DashboardPage');
  
  // Preload databases page as it's commonly accessed
  import('@/pages/databases/DatabasesPage');
  
  // Preload shared UI components
  import('@/shared/ui/button');
  import('@/shared/ui/input');
}

// Route-based code splitting with preloading
export function preloadRoute(routeName: string) {
  const preloadMap: Record<string, () => Promise<any>> = {
    'dashboard': () => import('@/pages/dashboard/DashboardPage'),
    'databases': () => import('@/pages/databases/DatabasesPage'),
    'queries': () => import('@/pages/queries/QueriesPage'),
    'analytics': () => import('@/pages/analytics/AnalyticsPage'),
    'settings': () => import('@/pages/settings/SettingsPage'),
    'search': () => import('@/pages/search/SearchPage'),
    'visualizations': () => import('@/pages/visualizations/NetworkVisualizationPage'),
    'query-builder': () => import('@/pages/queries/VisualQueryBuilderPage'),
  };

  const preloader = preloadMap[routeName];
  if (preloader) {
    preloader().catch(console.warn);
  }
}

// Hook for preloading on hover
export function usePreloadOnHover(routeName: string) {
  const handleMouseEnter = () => {
    preloadRoute(routeName);
  };

  return { onMouseEnter: handleMouseEnter };
}