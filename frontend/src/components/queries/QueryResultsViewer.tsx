import { useState, useMemo } from "react";
import {
  Table,
  List,
  Code,
  Download,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  FunnelSimple,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

interface QueryResultsViewerProps {
  results?: any[];
  columns?: string[];
  query?: string;
  executionTime?: number;
  totalRows?: number;
  className?: string;
  onExport?: (format: "csv" | "json" | "xlsx") => void;
}

type ViewMode = "table" | "graph" | "json" | "raw";
type SortDirection = "asc" | "desc" | null;

interface ColumnSort {
  column: string;
  direction: SortDirection;
}

export function QueryResultsViewer({
  results = [],
  columns = [],
  executionTime,
  className,
  onExport,
}: QueryResultsViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSort, setColumnSort] = useState<ColumnSort>({ column: "", direction: null });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Auto-detect columns if not provided
  const detectedColumns = useMemo(() => {
    if (columns.length > 0) return columns;
    if (results.length === 0) return [];
    
    const firstRow = results[0];
    if (typeof firstRow === "object" && firstRow !== null) {
      return Object.keys(firstRow);
    }
    
    return ["value"];
  }, [columns, results]);

  // Filter and sort results
  const processedResults = useMemo(() => {
    let filtered = results;

    // Apply search filter
    if (searchTerm) {
      filtered = results.filter((row) => {
        const searchValue = searchTerm.toLowerCase();
        return detectedColumns.some((col) => {
          const cellValue = row[col];
          return String(cellValue).toLowerCase().includes(searchValue);
        });
      });
    }

    // Apply sorting
    if (columnSort.column && columnSort.direction) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[columnSort.column];
        const bVal = b[columnSort.column];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return columnSort.direction === "asc" ? -1 : 1;
        if (bVal == null) return columnSort.direction === "asc" ? 1 : -1;

        // Compare values
        if (typeof aVal === "number" && typeof bVal === "number") {
          return columnSort.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (columnSort.direction === "asc") {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [results, searchTerm, columnSort, detectedColumns]);

  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedResults.slice(startIndex, startIndex + pageSize);
  }, [processedResults, currentPage, pageSize]);

  const totalPages = Math.ceil(processedResults.length / pageSize);

  const handleSort = (column: string) => {
    setColumnSort((prev) => {
      if (prev.column === column) {
        const newDirection = 
          prev.direction === null ? "asc" :
          prev.direction === "asc" ? "desc" : null;
        return { column: newDirection ? column : "", direction: newDirection };
      }
      return { column, direction: "asc" };
    });
  };

  const handleColumnVisibility = (column: string) => {
    setHiddenColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }
    
    if (typeof value === "boolean") {
      return <span className={value ? "text-green-600" : "text-red-600"}>{String(value)}</span>;
    }
    
    if (typeof value === "object") {
      return <span className="font-mono text-sm">{JSON.stringify(value, null, 2)}</span>;
    }
    
    return String(value);
  };

  const exportData = (format: "csv" | "json" | "xlsx") => {
    if (onExport) {
      onExport(format);
      return;
    }

    // Default export implementation
    let content = "";
    let filename = `query_results_${Date.now()}`;
    let mimeType = "";

    switch (format) {
      case "csv":
        const visibleColumns = detectedColumns.filter(col => !hiddenColumns.has(col));
        const csvHeaders = visibleColumns.join(",");
        const csvRows = processedResults.map(row => 
          visibleColumns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return "";
            if (typeof value === "string" && value.includes(",")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          }).join(",")
        );
        content = [csvHeaders, ...csvRows].join("\n");
        filename += ".csv";
        mimeType = "text/csv";
        break;

      case "json":
        content = JSON.stringify(processedResults, null, 2);
        filename += ".json";
        mimeType = "application/json";
        break;
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const visibleColumns = detectedColumns.filter(col => !hiddenColumns.has(col));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Query Results</h3>
          
          {/* View mode toggles */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="px-3"
            >
              <Table size={16} className="mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === "json" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("json")}
              className="px-3"
            >
              <Code size={16} className="mr-1" />
              JSON
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filters toggle */}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelSimple size={16} className="mr-1" />
            Filters
          </Button>

          {/* Export */}
          <div className="relative group">
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-1" />
              Export
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-50 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => exportData("csv")}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportData("json")}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Column Visibility</h4>
            <div className="text-sm text-muted-foreground">
              {visibleColumns.length} of {detectedColumns.length} columns visible
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {detectedColumns.map((column) => (
              <button
                key={column}
                onClick={() => handleColumnVisibility(column)}
                className={cn(
                  "flex items-center space-x-1 px-3 py-1 rounded-md text-sm border transition-colors",
                  hiddenColumns.has(column)
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-primary text-primary-foreground border-primary"
                )}
              >
                {hiddenColumns.has(column) ? (
                  <EyeSlash size={14} />
                ) : (
                  <Eye size={14} />
                )}
                <span>{column}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>
            Showing {paginatedResults.length} of {processedResults.length} rows
            {searchTerm && ` (filtered from ${results.length} total)`}
          </span>
          {executionTime && (
            <span>Execution time: {executionTime}ms</span>
          )}
        </div>
        
        {/* Page size selector */}
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>

      {/* Results display */}
      {viewMode === "table" ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {visibleColumns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort(column)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column}</span>
                        {columnSort.column === column && (
                          columnSort.direction === "asc" ? (
                            <CaretUp size={14} />
                          ) : (
                            <CaretDown size={14} />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((row, index) => (
                  <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                    {visibleColumns.map((column) => (
                      <td key={column} className="px-4 py-3 text-sm">
                        {formatCellValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-muted/30">
          <pre className="text-sm font-mono overflow-auto">
            {JSON.stringify(paginatedResults, null, 2)}
          </pre>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <List size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No results to display</p>
          <p className="text-sm">Execute a query to see results here</p>
        </div>
      )}
    </div>
  );
}