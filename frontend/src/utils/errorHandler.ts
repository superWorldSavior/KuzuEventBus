interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  buildVersion?: string;
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  context: ErrorContext;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private isInitialized = false;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  initialize() {
    if (this.isInitialized) return;

    // Set up global error handlers
    this.setupGlobalHandlers();
    
    // Set up unhandled promise rejection handler
    this.setupPromiseRejectionHandler();
    
    this.isInitialized = true;
    console.log('ErrorHandler initialized');
  }

  private setupGlobalHandlers() {
    // Capture unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        level: 'error',
        tags: { source: 'global' },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          level: 'error',
          tags: { source: 'unhandled-promise' },
        }
      );
    });
  }

  private setupPromiseRejectionHandler() {
    // Override console.error to capture logged errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError.apply(console, args);
      
      // Capture if it looks like an error
      const firstArg = args[0];
      if (firstArg instanceof Error) {
        this.captureError(firstArg, {
          level: 'error',
          tags: { source: 'console' },
          extra: { args: args.slice(1) },
        });
      }
    };
  }

  captureError(error: Error, options?: {
    level?: 'error' | 'warning' | 'info';
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    userId?: string;
  }) {
    const errorId = this.generateErrorId();
    const context = this.getErrorContext(options?.userId);
    
    const errorReport: ErrorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      level: options?.level || 'error',
      context,
      tags: options?.tags,
      extra: options?.extra,
    };

    // Add to queue
    this.addToQueue(errorReport);
    
    // Send to reporting service (in production)
    this.sendErrorReport(errorReport);
    
    return errorId;
  }

  captureMessage(message: string, options?: {
    level?: 'error' | 'warning' | 'info';
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }) {
    const error = new Error(message);
    return this.captureError(error, options);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getErrorContext(userId?: string): ErrorContext {
    return {
      userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      buildVersion: process.env.REACT_APP_VERSION || 'unknown',
    };
  }

  private addToQueue(errorReport: ErrorReport) {
    this.errorQueue.push(errorReport);
    
    // Trim queue if it gets too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report: ${errorReport.errorId}`);
      console.error('Message:', errorReport.message);
      console.error('Stack:', errorReport.stack);
      console.error('Context:', errorReport.context);
      if (errorReport.tags) console.error('Tags:', errorReport.tags);
      if (errorReport.extra) console.error('Extra:', errorReport.extra);
      console.groupEnd();
      return;
    }

    // In production, send to error reporting service
    try {
      await fetch('/api/v1/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (sendError) {
      console.error('Failed to send error report:', sendError);
    }
  }

  // Get recent errors for debugging
  getRecentErrors(limit = 10): ErrorReport[] {
    return this.errorQueue.slice(-limit);
  }

  // Clear error queue
  clearErrors() {
    this.errorQueue = [];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Helper functions for common error scenarios
export const captureApiError = (error: any, endpoint: string, method: string) => {
  return errorHandler.captureError(
    error instanceof Error ? error : new Error(String(error)),
    {
      level: 'error',
      tags: {
        type: 'api-error',
        endpoint,
        method,
      },
      extra: {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
      },
    }
  );
};

export const captureNavigationError = (error: any, route: string) => {
  return errorHandler.captureError(
    error instanceof Error ? error : new Error(String(error)),
    {
      level: 'error',
      tags: {
        type: 'navigation-error',
        route,
      },
    }
  );
};

export const captureValidationError = (error: any, formName: string, field?: string) => {
  return errorHandler.captureError(
    error instanceof Error ? error : new Error(String(error)),
    {
      level: 'warning',
      tags: {
        type: 'validation-error',
        form: formName,
        field: field || 'unknown',
      },
    }
  );
};

export const capturePerformanceIssue = (message: string, metric: string, value: number, threshold: number) => {
  return errorHandler.captureMessage(
    `Performance issue: ${message} (${metric}: ${value}, threshold: ${threshold})`,
    {
      level: 'warning',
      tags: {
        type: 'performance',
        metric,
      },
      extra: {
        value,
        threshold,
        exceeded: value > threshold,
      },
    }
  );
};

// React hook for error handling
export function useErrorHandler() {
  const captureError = React.useCallback((error: Error, options?: Parameters<typeof errorHandler.captureError>[1]) => {
    return errorHandler.captureError(error, options);
  }, []);

  const captureMessage = React.useCallback((message: string, options?: Parameters<typeof errorHandler.captureMessage>[1]) => {
    return errorHandler.captureMessage(message, options);
  }, []);

  return {
    captureError,
    captureMessage,
    captureApiError,
    captureNavigationError,
    captureValidationError,
    capturePerformanceIssue,
  };
}

// Initialize error handler
if (typeof window !== 'undefined') {
  errorHandler.initialize();
}

// Fix React import for the hook
import React from 'react';