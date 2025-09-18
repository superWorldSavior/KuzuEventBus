import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Warning, ArrowClockwise, House, Bug } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'global';
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to error reporting service
    this.reportError(error, errorInfo, errorId);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo, errorId: string) {
    // In production, this would send to an error reporting service like Sentry
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: this.props.level || 'component',
    };

    // For now, just log to console
    console.error('Error Report:', errorReport);
    
    // TODO: Send to error reporting service
    // errorReportingService.captureException(error, { extra: errorReport });
  }

  private retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private goHome = () => {
    window.location.href = '/';
  };

  private reloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', showDetails = false } = this.props;
      const { error, errorInfo, errorId } = this.state;

      // Different UI based on error level
      const isGlobalError = level === 'global';
      const isPageError = level === 'page';

      return (
        <div className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          isGlobalError ? "min-h-screen bg-gray-50" : "min-h-[400px] bg-gray-50 rounded-lg border",
          isPageError && "min-h-[60vh]"
        )}>
          <div className="max-w-md mx-auto">
            {/* Error Icon */}
            <div className={cn(
              "mx-auto mb-6 rounded-full flex items-center justify-center",
              isGlobalError ? "w-20 h-20 bg-red-100" : "w-16 h-16 bg-red-100"
            )}>
              <Warning 
                size={isGlobalError ? 40 : 32} 
                className="text-red-600" 
              />
            </div>

            {/* Error Title */}
            <h2 className={cn(
              "font-semibold text-gray-900 mb-4",
              isGlobalError ? "text-2xl" : "text-xl"
            )}>
              {isGlobalError ? "Application Error" : "Something went wrong"}
            </h2>

            {/* Error Message */}
            <p className="text-gray-600 mb-6">
              {isGlobalError 
                ? "We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists."
                : "This component encountered an error and couldn't render properly."
              }
            </p>

            {/* Error ID */}
            {errorId && (
              <p className="text-xs text-gray-500 mb-6 font-mono">
                Error ID: {errorId}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.retry}
                className="flex items-center gap-2"
              >
                <ArrowClockwise size={16} />
                Try Again
              </Button>

              {isGlobalError ? (
                <Button
                  variant="outline"
                  onClick={this.reloadPage}
                  className="flex items-center gap-2"
                >
                  <ArrowClockwise size={16} />
                  Reload Page
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={this.goHome}
                  className="flex items-center gap-2"
                >
                  <House size={16} />
                  Go Home
                </Button>
              )}
            </div>

            {/* Error Details (Development) */}
            {showDetails && process.env.NODE_ENV === 'development' && error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Bug size={16} />
                  Technical Details
                </summary>
                <div className="mt-4 p-4 bg-gray-100 rounded border text-xs font-mono overflow-auto max-h-40">
                  <div className="mb-4">
                    <strong>Error:</strong> {error.toString()}
                  </div>
                  {error.stack && (
                    <div className="mb-4">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Specialized error boundaries for different contexts
export const GlobalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="global" 
    showDetails={true}
    onError={(error, errorInfo) => {
      // Global error reporting
      console.error('Global error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="page"
    onError={(error, errorInfo) => {
      // Page-level error reporting
      console.error('Page error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName?: string;
}> = ({ children, componentName }) => (
  <ErrorBoundary 
    level="component"
    onError={(error, errorInfo) => {
      // Component-level error reporting
      console.error(`Component error${componentName ? ` in ${componentName}` : ''}:`, error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Hook for programmatic error handling
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Handled error:', error, errorInfo);
    
    // In development, throw the error to trigger error boundary
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    
    // In production, report to error service
    // errorReportingService.captureException(error, { extra: { errorInfo } });
  }, []);
}