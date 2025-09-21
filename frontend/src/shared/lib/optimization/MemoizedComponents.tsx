import React from "react";
import { QueryExecutor } from "@/features/query-execution/components/QueryExecutor";
import { VirtualizedQueryResults } from "@/features/query-execution/components/VirtualizedQueryResults";
import { cn } from "@/shared/lib/utils";

// Memoized Query Executor
export const MemoizedQueryExecutor = React.memo(QueryExecutor, (prevProps, nextProps) => {
  // Custom comparison to optimize re-renders
  return (
    prevProps.initialQuery === nextProps.initialQuery &&
    prevProps.selectedDatabase === nextProps.selectedDatabase &&
    prevProps.showProgress === nextProps.showProgress &&
    prevProps.showControls === nextProps.showControls
  );
});

MemoizedQueryExecutor.displayName = "MemoizedQueryExecutor";

// Memoized Query Results
export const MemoizedVirtualizedQueryResults = React.memo(
  VirtualizedQueryResults, 
  (prevProps, nextProps) => {
    // Only re-render if essential props change
    return (
      prevProps.results === nextProps.results &&
      prevProps.columns === nextProps.columns &&
      prevProps.executionTime === nextProps.executionTime &&
      prevProps.totalRows === nextProps.totalRows &&
      prevProps.isLoadingMore === nextProps.isLoadingMore
    );
  }
);

MemoizedVirtualizedQueryResults.displayName = "MemoizedVirtualizedQueryResults";

// Memoized Database Card Component
interface DatabaseCardProps {
  database: {
    database_id: string;
    name: string;
    description?: string;
    size_bytes: number;
    table_count: number;
    created_at: string;
    last_accessed?: string;
  };
  onSelect?: (databaseId: string) => void;
  onDelete?: (databaseId: string) => void;
  isSelected?: boolean;
  className?: string;
}

const DatabaseCardComponent: React.FC<DatabaseCardProps> = ({
  database,
  onSelect,
  onDelete,
  isSelected = false,
  className,
}) => {
  const handleSelect = React.useCallback(() => {
    onSelect?.(database.database_id);
  }, [onSelect, database.database_id]);

  const handleDelete = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(database.database_id);
  }, [onDelete, database.database_id]);

  const formatBytes = React.useMemo(() => {
    const bytes = database.size_bytes;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, [database.size_bytes]);

  const lastAccessedText = React.useMemo(() => {
    if (!database.last_accessed) return 'Never';
    const date = new Date(database.last_accessed);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }, [database.last_accessed]);

  return (
    <div
      className={cn(
        "p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && "border-primary bg-primary/10",
        className
      )}
      onClick={handleSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-sm">{database.name}</h3>
          {database.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {database.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{formatBytes}</span>
            <span>{database.table_count} tables</span>
            <span>Last accessed: {lastAccessedText}</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="ml-2 p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground"
          title="Delete database"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const MemoizedDatabaseCard = React.memo(DatabaseCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.database.database_id === nextProps.database.database_id &&
    prevProps.database.name === nextProps.database.name &&
    prevProps.database.size_bytes === nextProps.database.size_bytes &&
    prevProps.database.table_count === nextProps.database.table_count &&
    prevProps.database.last_accessed === nextProps.database.last_accessed &&
    prevProps.isSelected === nextProps.isSelected
  );
});

MemoizedDatabaseCard.displayName = "MemoizedDatabaseCard";

// Memoized Database List
interface DatabaseListProps {
  databases: DatabaseCardProps['database'][];
  onSelect?: (databaseId: string) => void;
  onDelete?: (databaseId: string) => void;
  selectedDatabase?: string;
  className?: string;
}

const DatabaseListComponent: React.FC<DatabaseListProps> = ({
  databases,
  onSelect,
  onDelete,
  selectedDatabase,
  className,
}) => {
  if (databases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No databases found
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3", className)}>
      {databases.map((database) => (
        <MemoizedDatabaseCard
          key={database.database_id}
          database={database}
          onSelect={onSelect}
          onDelete={onDelete}
          isSelected={selectedDatabase === database.database_id}
        />
      ))}
    </div>
  );
};

export const MemoizedDatabaseList = React.memo(DatabaseListComponent, (prevProps, nextProps) => {
  // Shallow comparison for arrays
  if (prevProps.databases.length !== nextProps.databases.length) return false;
  
  for (let i = 0; i < prevProps.databases.length; i++) {
    if (prevProps.databases[i].database_id !== nextProps.databases[i].database_id) {
      return false;
    }
  }
  
  return (
    prevProps.selectedDatabase === nextProps.selectedDatabase &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDelete === nextProps.onDelete
  );
});

MemoizedDatabaseList.displayName = "MemoizedDatabaseList";

// Context-based optimization for expensive operations
interface QueryContextValue {
  currentQuery: string;
  setCurrentQuery: (query: string) => void;
  selectedDatabase: string | null;
  setSelectedDatabase: (id: string | null) => void;
  queryHistory: string[];
  addToHistory: (query: string) => void;
}

const QueryContext = React.createContext<QueryContextValue | null>(null);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [currentQuery, setCurrentQuery] = React.useState("");
  const [selectedDatabase, setSelectedDatabase] = React.useState<string | null>(null);
  const [queryHistory, setQueryHistory] = React.useState<string[]>([]);

  const addToHistory = React.useCallback((query: string) => {
    setQueryHistory(prev => {
      const newHistory = [query, ...prev.filter(q => q !== query)];
      return newHistory.slice(0, 50); // Keep only last 50 queries
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo<QueryContextValue>(() => ({
    currentQuery,
    setCurrentQuery,
    selectedDatabase,
    setSelectedDatabase,
    queryHistory,
    addToHistory,
  }), [currentQuery, selectedDatabase, queryHistory, addToHistory]);

  return (
    <QueryContext.Provider value={contextValue}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQueryContext() {
  const context = React.useContext(QueryContext);
  if (!context) {
    throw new Error("useQueryContext must be used within QueryProvider");
  }
  return context;
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = React.useRef(0);
  const lastRenderTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    renderCountRef.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} render #${renderCountRef.current} (${timeSinceLastRender}ms since last)`);
    }

    lastRenderTimeRef.current = currentTime;
  });

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current,
  };
}