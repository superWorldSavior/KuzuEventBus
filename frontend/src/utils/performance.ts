import { useEffect, useRef, useCallback } from 'react';

// Performance metrics interface
interface PerformanceMetrics {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  type: 'navigation' | 'component' | 'api' | 'custom';
  metadata?: Record<string, any>;
}

// Performance observer for monitoring
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Observe navigation timing
    this.observeNavigationTiming();
    
    // Observe resource timing
    this.observeResourceTiming();
    
    // Observe largest contentful paint
    this.observeLCP();
    
    // Observe first input delay
    this.observeFID();
    
    // Observe cumulative layout shift
    this.observeCLS();

    this.isInitialized = true;
    console.log('🔍 Performance monitoring initialized');
  }

  private observeNavigationTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric({
              id: 'navigation',
              name: 'Navigation Timing',
              startTime: navEntry.fetchStart,
              endTime: navEntry.loadEventEnd,
              duration: navEntry.loadEventEnd - navEntry.fetchStart,
              type: 'navigation',
              metadata: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint(),
              },
            });
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 100) { // Only track slow resources
            this.recordMetric({
              id: `resource-${Date.now()}`,
              name: `Resource: ${entry.name}`,
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              duration: entry.duration,
              type: 'api',
              metadata: {
                url: entry.name,
                size: (entry as any).transferSize || 0,
              },
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  private observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric({
            id: 'lcp',
            name: 'Largest Contentful Paint',
            startTime: 0,
            endTime: lastEntry.startTime,
            duration: lastEntry.startTime,
            type: 'navigation',
            metadata: {
              element: (lastEntry as any).element?.tagName,
              url: (lastEntry as any).url,
            },
          });
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }
  }

  private observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            id: 'fid',
            name: 'First Input Delay',
            startTime: entry.startTime,
            endTime: entry.startTime + (entry as any).processingStart,
            duration: (entry as any).processingStart - entry.startTime,
            type: 'navigation',
            metadata: {
              eventType: (entry as any).name,
            },
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    }
  }

  private observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });

        this.recordMetric({
          id: 'cls',
          name: 'Cumulative Layout Shift',
          startTime: 0,
          endTime: performance.now(),
          duration: clsValue,
          type: 'navigation',
          metadata: {
            score: clsValue,
          },
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    }
  }

  private getFirstPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }

  private getFirstContentfulPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp?.startTime;
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && metric.duration && metric.duration > 1000) {
      console.warn(`🐌 Slow operation detected:`, metric);
    }
  }

  startTiming(name: string, type: PerformanceMetrics['type'] = 'custom'): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    performance.mark(`${id}-start`);
    
    // Store start information
    this.recordMetric({
      id,
      name,
      startTime,
      type,
    });

    return id;
  }

  endTiming(id: string, metadata?: Record<string, any>) {
    const endTime = performance.now();
    const metric = this.metrics.find(m => m.id === id);
    
    if (metric) {
      const duration = endTime - metric.startTime;
      
      // Update metric
      Object.assign(metric, {
        endTime,
        duration,
        metadata: { ...metric.metadata, ...metadata },
      });

      performance.mark(`${id}-end`);
      performance.measure(metric.name, `${id}-start`, `${id}-end`);
    }

    return metric;
  }

  getMetrics(type?: PerformanceMetrics['type']): PerformanceMetrics[] {
    return type ? this.metrics.filter(m => m.type === type) : this.metrics;
  }

  getAverageByName(name: string): number | null {
    const filteredMetrics = this.metrics.filter(m => m.name === name && m.duration);
    if (filteredMetrics.length === 0) return null;
    
    const total = filteredMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / filteredMetrics.length;
  }

  clearMetrics() {
    this.metrics = [];
    performance.clearMarks();
    performance.clearMeasures();
  }

  getReport(): {
    navigation: PerformanceMetrics[];
    components: PerformanceMetrics[];
    api: PerformanceMetrics[];
    custom: PerformanceMetrics[];
    summary: {
      totalMetrics: number;
      slowOperations: number;
      averageApiTime: number | null;
      averageComponentTime: number | null;
    };
  } {
    const navigation = this.getMetrics('navigation');
    const components = this.getMetrics('component');
    const api = this.getMetrics('api');
    const custom = this.getMetrics('custom');
    
    const slowOperations = this.metrics.filter(m => m.duration && m.duration > 1000).length;
    
    return {
      navigation,
      components,
      api,
      custom,
      summary: {
        totalMetrics: this.metrics.length,
        slowOperations,
        averageApiTime: this.calculateAverage(api),
        averageComponentTime: this.calculateAverage(components),
      },
    };
  }

  private calculateAverage(metrics: PerformanceMetrics[]): number | null {
    const withDuration = metrics.filter(m => m.duration);
    if (withDuration.length === 0) return null;
    
    const total = withDuration.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / withDuration.length;
  }

  dispose() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hooks for performance monitoring
export function usePerformanceMonitor() {
  useEffect(() => {
    performanceMonitor.initialize();
    return () => {
      // Don't dispose on component unmount, keep monitoring globally
    };
  }, []);

  return performanceMonitor;
}

export function useComponentTiming(componentName: string) {
  const timingId = useRef<string | null>(null);

  useEffect(() => {
    // Start timing on mount
    timingId.current = performanceMonitor.startTiming(
      `Component: ${componentName}`,
      'component'
    );

    return () => {
      // End timing on unmount
      if (timingId.current) {
        performanceMonitor.endTiming(timingId.current, {
          lifecycle: 'unmount',
        });
      }
    };
  }, [componentName]);

  const startTiming = useCallback((operationName: string) => {
    return performanceMonitor.startTiming(
      `${componentName}: ${operationName}`,
      'component'
    );
  }, [componentName]);

  const endTiming = useCallback((id: string, metadata?: Record<string, any>) => {
    return performanceMonitor.endTiming(id, metadata);
  }, []);

  return { startTiming, endTiming };
}

export function useApiTiming() {
  const measureApiCall = useCallback(async <T,>(
    apiCall: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const timingId = performanceMonitor.startTiming(
      `API: ${operationName}`,
      'api'
    );

    try {
      const result = await apiCall();
      performanceMonitor.endTiming(timingId, {
        status: 'success',
      });
      return result;
    } catch (error) {
      performanceMonitor.endTiming(timingId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, []);

  return { measureApiCall };
}

// Utility function for measuring bundle sizes
export function measureBundleLoad(bundleName: string) {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    performanceMonitor.recordMetric({
      id: `bundle-${Date.now()}`,
      name: `Bundle: ${bundleName}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      type: 'navigation',
      metadata: {
        bundleName,
      },
    });
  };
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.initialize();
}