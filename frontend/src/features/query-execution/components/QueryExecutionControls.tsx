import { useState } from "react";
import { 
  Play, 
  Stop, 
  Pause, 
  Clock, 
  Database, 
  ListBullets,
  Download,
  Share,
  Copy
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/utils";

interface QueryExecutionControlsProps {
  onExecute: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  isExecuting?: boolean;
  isPaused?: boolean;
  canStop?: boolean;
  canPause?: boolean;
  selectedDatabase?: string;
  databases?: Array<{ id: string; name: string }>;
  onDatabaseChange?: (databaseId: string) => void;
  executionTime?: number;
  resultCount?: number;
  className?: string;
}

export function QueryExecutionControls({
  onExecute,
  onStop,
  onPause,
  onExport,
  onShare,
  onCopy,
  isExecuting = false,
  isPaused = false,
  canStop = false,
  canPause = false,
  selectedDatabase,
  databases = [],
  onDatabaseChange,
  executionTime,
  resultCount,
  className,
}: QueryExecutionControlsProps) {
  const [showActions, setShowActions] = useState(false);

  const formatExecutionTime = (timeMs?: number) => {
    if (!timeMs) return "0ms";
    if (timeMs < 1000) return `${timeMs}ms`;
    if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`;
    return `${(timeMs / 60000).toFixed(1)}m`;
  };

  const formatResultCount = (count?: number) => {
    if (!count && count !== 0) return "No results";
    if (count === 1) return "1 result";
    if (count < 1000) return `${count} results`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K results`;
    return `${(count / 1000000).toFixed(1)}M results`;
  };

  return (
    <div className={cn("flex items-center justify-between p-4 bg-muted/50 border-t", className)}>
      {/* Left side - Execution controls */}
      <div className="flex items-center space-x-3">
        {/* Primary execute button */}
        <Button
          onClick={onExecute}
          disabled={isExecuting && !isPaused}
          size="sm"
          className="px-6"
        >
          <Play size={16} className="mr-2" />
          {isExecuting && !isPaused ? "Running..." : "Execute"}
        </Button>

        {/* Stop button */}
        {canStop && (
          <Button
            onClick={onStop}
            disabled={!isExecuting}
            variant="outline"
            size="sm"
          >
            <Stop size={16} className="mr-2" />
            Stop
          </Button>
        )}

        {/* Pause button */}
        {canPause && (
          <Button
            onClick={onPause}
            disabled={!isExecuting || isPaused}
            variant="outline"
            size="sm"
          >
            <Pause size={16} className="mr-2" />
            {isPaused ? "Paused" : "Pause"}
          </Button>
        )}

        {/* Database selector */}
        {databases.length > 0 && (
          <div className="flex items-center space-x-2 ml-4">
            <Database size={16} className="text-muted-foreground" />
            <select
              value={selectedDatabase || ""}
              onChange={(e) => onDatabaseChange?.(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isExecuting}
            >
              <option value="">Select database...</option>
              {databases.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center - Execution stats */}
      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
        {/* Execution time */}
        <div className="flex items-center space-x-1">
          <Clock size={14} />
          <span>{formatExecutionTime(executionTime)}</span>
        </div>

        {/* Result count */}
        <div className="flex items-center space-x-1">
          <ListBullets size={14} />
          <span>{formatResultCount(resultCount)}</span>
        </div>

        {/* Execution status indicator */}
        {isExecuting && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-600 font-medium">
              {isPaused ? "Paused" : "Executing"}
            </span>
          </div>
        )}
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center space-x-2">
        {/* Copy button */}
        <Button
          onClick={onCopy}
          variant="ghost"
          size="sm"
          className="px-3"
          title="Copy query"
        >
          <Copy size={16} />
        </Button>

        {/* More actions dropdown */}
        <div className="relative">
          <Button
            onClick={() => setShowActions(!showActions)}
            variant="ghost"
            size="sm"
            className="px-3"
          >
            <Download size={16} className="mr-1" />
            Actions
          </Button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
              {onExport && (
                <button
                  onClick={() => {
                    onExport();
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center space-x-2"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              )}
              
              {onShare && (
                <button
                  onClick={() => {
                    onShare();
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center space-x-2"
                >
                  <Share size={14} />
                  <span>Share Query</span>
                </button>
              )}

              <div className="border-t my-1" />
              
              <button
                onClick={() => setShowActions(false)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}