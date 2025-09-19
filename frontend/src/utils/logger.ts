type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }

    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
    };

    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In production, you could send errors to a logging service
    if (!this.isDevelopment && level === 'error') {
      // TODO: Send to error reporting service
      // errorReportingService.captureException(new Error(message), { extra: context });
    }
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context || '');
      this.addLog('debug', message, context);
    }
  }

  info(message: string, context?: Record<string, any>) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, context || '');
      this.addLog('info', message, context);
    }
  }

  warn(message: string, context?: Record<string, any>) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context || '');
      this.addLog('warn', message, context);
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, context || '');
      this.addLog('error', message, { 
        ...context, 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error 
      });
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Performance logging
  time(label: string) {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Group logging for related operations
  group(label: string) {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Create singleton logger instance
const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => logger.error(message, error, context),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
  getLogs: () => logger.getLogs(),
  clearLogs: () => logger.clearLogs(),
};

export default logger;