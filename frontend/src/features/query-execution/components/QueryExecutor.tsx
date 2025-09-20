import { useState, useEffect } from "react";
import LazyCypherEditor from "@/shared/ui/lazy/LazyCypherEditor";
import { QueryExecutionControls } from "./QueryExecutionControls";
import { QueryProgress } from "./QueryProgress";
import { useDatabases, useRunQuery } from "@/shared/hooks/useApi";
import { cn } from "@/utils";

interface QueryExecutorProps {
  initialQuery?: string;
  selectedDatabase?: string;
  onDatabaseChange?: (databaseId: string) => void;
  onQueryChange?: (query: string) => void;
  onExecutionStart?: () => void;
  onExecutionComplete?: (results: any) => void;
  onExecutionError?: (error: string) => void;
  className?: string;
  showProgress?: boolean;
  showControls?: boolean;
}

interface QueryExecution {
  id: string;
  query: string;
  database: string;
  status: "idle" | "running" | "paused" | "completed" | "error" | "cancelled";
  startTime?: Date;
  endTime?: Date;
  resultCount?: number;
  errorMessage?: string;
  progress?: number;
}

export function QueryExecutor({
  initialQuery = "",
  selectedDatabase,
  onDatabaseChange,
  onQueryChange,
  onExecutionStart,
  onExecutionComplete,
  onExecutionError,
  className,
  showProgress = true,
  showControls = true,
}: QueryExecutorProps) {
  const [query, setQuery] = useState(initialQuery);
  const [currentDatabase, setCurrentDatabase] = useState(selectedDatabase || "");
  const [execution, setExecution] = useState<QueryExecution>({
    id: "",
    query: "",
    database: "",
    status: "idle",
  });

  // API hooks
  const { data: databases = [] } = useDatabases();
  const runQueryMutation = useRunQuery();

  // Update query when prop changes
  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Update database when prop changes
  useEffect(() => {
    if (selectedDatabase && selectedDatabase !== currentDatabase) {
      setCurrentDatabase(selectedDatabase);
    }
  }, [selectedDatabase]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  const handleDatabaseChange = (databaseId: string) => {
    setCurrentDatabase(databaseId);
    onDatabaseChange?.(databaseId);
  };

  const handleExecute = async () => {
    if (!query.trim()) {
      alert("Please enter a query to execute");
      return;
    }

    if (!currentDatabase) {
      alert("Please select a database");
      return;
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start execution
    setExecution({
      id: executionId,
      query: query.trim(),
      database: currentDatabase,
      status: "running",
      startTime: new Date(),
      progress: 0,
    });

    onExecutionStart?.();

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExecution(prev => {
          if (prev.status === "running" && prev.progress !== undefined && prev.progress < 95) {
            return {
              ...prev,
              progress: Math.min(95, prev.progress + Math.random() * 15),
            };
          }
          return prev;
        });
      }, 500);

      // Execute the query
      const result = await runQueryMutation.mutateAsync({
        query: query.trim(),
        databaseId: currentDatabase,
        parameters: {},
      });

      // Clear progress interval
      clearInterval(progressInterval);

      // Complete execution
      setExecution(prev => ({
        ...prev,
        status: "completed",
        endTime: new Date(),
        progress: 100,
        resultCount: (result as any)?.results?.rows?.length || 0,
      }));

      onExecutionComplete?.(result);

    } catch (error) {
      // Clear progress interval on error
      const progressInterval = setInterval(() => {}, 0);
      clearInterval(progressInterval);

      const errorMessage = error instanceof Error ? error.message : "Query execution failed";
      
      setExecution(prev => ({
        ...prev,
        status: "error",
        endTime: new Date(),
        errorMessage,
      }));

      onExecutionError?.(errorMessage);
    }
  };

  const handleStop = () => {
    setExecution(prev => ({
      ...prev,
      status: "cancelled",
      endTime: new Date(),
    }));
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export results");
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log("Share query");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      // TODO: Show toast notification
      console.log("Query copied to clipboard");
    } catch (error) {
      console.error("Failed to copy query:", error);
    }
  };

  const isExecuting = execution.status === "running";
  const canStop = isExecuting;

  // Transform database list for controls
  const databaseOptions = databases.map(db => ({
    id: db.id,
    name: db.name,
  }));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Query Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Query Editor</h3>
          <div className="text-sm text-muted-foreground">
            {currentDatabase && (
              <span>
                Database: {databases.find(db => db.id === currentDatabase)?.name || currentDatabase}
              </span>
            )}
          </div>
        </div>
        
        <LazyCypherEditor
          value={query}
          onChange={handleQueryChange}
          onExecute={handleExecute}
          height="300px"
          placeholder="// Enter your Cypher query here
// Example: MATCH (n) RETURN n LIMIT 10
// Press Ctrl+Enter to execute"
          className="w-full"
        />
      </div>

      {/* Execution Controls */}
      {showControls && (
        <QueryExecutionControls
          onExecute={handleExecute}
          onStop={handleStop}
          onExport={handleExport}
          onShare={handleShare}
          onCopy={handleCopy}
          isExecuting={isExecuting}
          canStop={canStop}
          selectedDatabase={currentDatabase}
          databases={databaseOptions}
          onDatabaseChange={handleDatabaseChange}
          executionTime={execution.startTime && execution.endTime ? 
            execution.endTime.getTime() - execution.startTime.getTime() : 
            execution.startTime ? Date.now() - execution.startTime.getTime() : undefined
          }
          resultCount={execution.resultCount}
        />
      )}

      {/* Query Progress */}
      {showProgress && execution.status !== "idle" && (
        <QueryProgress
          queryId={execution.id}
          query={execution.query}
          status={execution.status}
          progress={execution.progress}
          startTime={execution.startTime}
          endTime={execution.endTime}
          database={databases.find(db => db.id === execution.database)?.name || execution.database}
          resultCount={execution.resultCount}
          errorMessage={execution.errorMessage}
          compact={false}
        />
      )}
    </div>
  );
}