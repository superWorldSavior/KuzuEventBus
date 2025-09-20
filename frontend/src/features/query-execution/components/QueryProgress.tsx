import { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Pause,
  ListBullets,
  Database,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";

interface QueryProgressProps {
  queryId?: string;
  query?: string;
  status: "idle" | "running" | "paused" | "completed" | "error" | "cancelled";
  progress?: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  database?: string;
  resultCount?: number;
  errorMessage?: string;
  estimatedTimeRemaining?: number;
  className?: string;
  compact?: boolean;
}

export function QueryProgress({
  queryId,
  query,
  status,
  progress = 0,
  startTime,
  endTime,
  database,
  resultCount,
  errorMessage,
  estimatedTimeRemaining,
  className,
  compact = false,
}: QueryProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time for running queries
  useEffect(() => {
    if (status === "running" && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 100);

      return () => clearInterval(interval);
    } else if (endTime && startTime) {
      setElapsedTime(endTime.getTime() - startTime.getTime());
    }
  }, [status, startTime, endTime]);

  const formatTime = (timeMs: number) => {
    if (timeMs < 1000) return `${timeMs}ms`;
    if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`;
    return `${(timeMs / 60000).toFixed(1)}m`;
  };

  const formatEstimatedTime = (timeMs: number) => {
    if (timeMs < 1000) return "< 1s";
    if (timeMs < 60000) return `~${Math.ceil(timeMs / 1000)}s`;
    return `~${Math.ceil(timeMs / 60000)}m`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle size={compact ? 16 : 20} className="text-green-500" />;
      case "error":
      case "cancelled":
        return <XCircle size={compact ? 16 : 20} className="text-red-500" />;
      case "paused":
        return <Pause size={compact ? 16 : 20} className="text-yellow-500" />;
      case "running":
        return (
          <div className={cn(
            "border-2 border-blue-500 border-t-transparent rounded-full animate-spin",
            compact ? "w-4 h-4" : "w-5 h-5"
          )} />
        );
      default:
        return <Clock size={compact ? 16 : 20} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "error":
      case "cancelled":
        return "text-red-600";
      case "paused":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "running":
        return "Executing...";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      case "cancelled":
        return "Cancelled";
      case "paused":
        return "Paused";
      default:
        return "Ready";
    }
  };

  const truncateQuery = (q: string, maxLength: number = 60) => {
    if (q.length <= maxLength) return q;
    return q.substring(0, maxLength) + "...";
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3 p-2 bg-muted/30 rounded-lg", className)}>
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 text-sm">
            <span className={cn("font-medium", getStatusColor())}>
              {getStatusText()}
            </span>
            
            {status === "running" && progress > 0 && (
              <span className="text-muted-foreground">
                {progress.toFixed(0)}%
              </span>
            )}
            
            <span className="text-muted-foreground">
              {formatTime(elapsedTime)}
            </span>
            
            {resultCount !== undefined && (
              <span className="text-muted-foreground">
                {resultCount} rows
              </span>
            )}
          </div>
          
          {status === "running" && progress > 0 && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 bg-card border rounded-lg space-y-4", className)}>
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className={cn("font-medium", getStatusColor())}>
              {getStatusText()}
            </h3>
            {queryId && (
              <p className="text-sm text-muted-foreground">
                Query ID: {queryId}
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{formatTime(elapsedTime)}</span>
          </div>
          
          {status === "running" && estimatedTimeRemaining && (
            <div className="text-xs mt-1">
              ETA: {formatEstimatedTime(estimatedTimeRemaining)}
            </div>
          )}
        </div>
      </div>

      {/* Query preview */}
      {query && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-mono text-foreground/80">
            {truncateQuery(query)}
          </p>
        </div>
      )}

      {/* Progress bar */}
      {status === "running" && progress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {database && (
          <div className="flex items-center space-x-2">
            <Database size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Database:</span>
            <span className="font-medium">{database}</span>
          </div>
        )}
        
        {resultCount !== undefined && (
          <div className="flex items-center space-x-2">
            <ListBullets size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Results:</span>
            <span className="font-medium">
              {resultCount.toLocaleString()} rows
            </span>
          </div>
        )}
        
        {startTime && (
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">
              {startTime.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        {endTime && (
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Finished:</span>
            <span className="font-medium">
              {endTime.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === "error" && errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start space-x-2">
            <Warning size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error Details</p>
              <p className="text-sm text-red-700 mt-1 font-mono">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}