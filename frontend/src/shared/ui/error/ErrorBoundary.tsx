import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Warning, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'global';
  showDetails?: boolean;
  isolate?: boolean;
  className?: string;
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
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isolate = false } = this.props;
      
      if (isolate) {
        return (
          <div className={cn("border border-red-200 rounded-lg p-4 bg-red-50", this.props.className)}>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Warning className="h-4 w-4" />
              <span className="font-medium">Component Error</span>
            </div>
            <Button variant="outline" size="sm" onClick={this.resetErrorBoundary}>
              <ArrowClockwise className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Warning size={32} className="text-red-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Something went wrong</h2>
          <Button onClick={this.resetErrorBoundary} className="flex items-center gap-2">
            <ArrowClockwise size={16} />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Handled error:', error, errorInfo);
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }, []);
}

export const GlobalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="global" 
    showDetails={true}
    onError={(error, errorInfo) => {
      console.error('Global error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);
