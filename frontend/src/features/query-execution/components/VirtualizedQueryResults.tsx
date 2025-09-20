import { useState, useMemo, useCallback, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import {
  Download,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  CaretDown,
  CaretUp,
  ArrowsOut,
  ArrowsIn,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/utils";

interface VirtualizedQueryResultsProps {
  results?: any[];
  columns?: string[];
  query?: string;
  executionTime?: number;
  totalRows?: number;
  className?: string;
  onExport?: (format: "csv" | "json" | "xlsx") => void;
  onLoadMore?: (startIndex: number, stopIndex: number) => Promise<void>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
}

type SortDirection = "asc" | "desc" | null;

interface ColumnSort {
  column: string;
  direction: SortDirection;
}

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 48;
const CONTROLS_HEIGHT = 60;

export function VirtualizedQueryResults({
  results = [],
  columns = [],
  executionTime,
  totalRows,
  className,
  onExport,
}: VirtualizedQueryResultsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSort, setColumnSort] = useState<ColumnSort>({ column: "", direction: null });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const listRef = useRef<React.ComponentRef<typeof List>>(null);

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

  // Visible columns (excluding hidden ones)
  const visibleColumns = useMemo(() => {
    return detectedColumns.filter(col => !hiddenColumns.has(col));
  }, [detectedColumns, hiddenColumns]);

  // Column width calculation
  const columnWidth = useMemo(() => {
    if (visibleColumns.length === 0) return 200;
    return Math.max(150, Math.floor((800 - 20) / visibleColumns.length));
  }, [visibleColumns.length]);

  // Filter and sort results
  const processedResults = useMemo(() => {
    let filtered = results;

    // Apply search filter
    if (searchTerm) {
      filtered = results.filter((row) => {
        const searchValue = searchTerm.toLowerCase();
        return visibleColumns.some((col) => {
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
  }, [results, searchTerm, columnSort, visibleColumns]);

  // Handle column sort
  const handleSort = useCallback((column: string) => {
    setColumnSort(prev => {
      if (prev.column === column) {
        // Cycle through: asc -> desc -> null
        const newDirection = prev.direction === "asc" ? "desc" : 
                            prev.direction === "desc" ? null : "asc";
        return { column: newDirection ? column : "", direction: newDirection };
      } else {
        return { column, direction: "asc" };
      }
    });
  }, []);

  // Handle column visibility toggle
  const toggleColumnVisibility = useCallback((column: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  }, []);

  // Handle export
  const handleExport = useCallback((format: "csv" | "json" | "xlsx") => {
    onExport?.(format);
  }, [onExport]);

  // Header component
  const HeaderRow = useCallback(() => (
    <div 
      className="flex border-b bg-muted/50 sticky top-0 z-10"
      style={{ height: HEADER_HEIGHT }}
    >
      {visibleColumns.map((column) => (
        <div
          key={column}
          className="flex items-center justify-between px-3 py-2 border-r cursor-pointer hover:bg-muted/80"
          style={{ width: columnWidth, minWidth: columnWidth }}
          onClick={() => handleSort(column)}
        >
          <span className="font-medium text-sm truncate">{column}</span>
          <div className="flex items-center gap-1">
            {columnSort.column === column && (
              <>
                {columnSort.direction === "asc" && <CaretUp size={14} />}
                {columnSort.direction === "desc" && <CaretDown size={14} />}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  ), [visibleColumns, columnWidth, columnSort, handleSort]);

  // Row component for virtualization
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = processedResults[index];
    
    if (!row) {
      return (
        <div style={style} className="flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      );
    }

    return (
      <div 
        style={style} 
        className={cn(
          "flex border-b hover:bg-muted/30",
          index % 2 === 0 ? "bg-background" : "bg-muted/20"
        )}
      >
        {visibleColumns.map((column) => (
          <div
            key={column}
            className="flex items-center px-3 py-2 border-r text-sm truncate"
            style={{ width: columnWidth, minWidth: columnWidth }}
            title={String(row[column] ?? "")}
          >
            {formatCellValue(row[column])}
          </div>
        ))}
      </div>
    );
  }, [processedResults, visibleColumns, columnWidth]);

  // Format cell values for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
  };

  // Calculate container height
  const containerHeight = isFullscreen ? 
    window.innerHeight - 100 : 
    Math.min(600, (processedResults.length * ROW_HEIGHT) + HEADER_HEIGHT + CONTROLS_HEIGHT);

  const listHeight = containerHeight - HEADER_HEIGHT - CONTROLS_HEIGHT;

  return (
    <div className={cn(
      "border rounded-lg bg-card",
      isFullscreen && "fixed inset-4 z-50 shadow-2xl",
      className
    )}>
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge className="font-mono">
            {processedResults.length} {processedResults.length === 1 ? "row" : "rows"}
            {totalRows && totalRows > processedResults.length && ` of ${totalRows.toLocaleString()}`}
          </Badge>
          {executionTime && (
            <Badge className="font-mono border-border">
              {executionTime}ms
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-48"
            />
          </div>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye size={16} />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {detectedColumns.map((column) => (
                <DropdownMenuItem
                  key={column}
                  onClick={() => toggleColumnVisibility(column)}
                  className="flex items-center gap-2"
                >
                  {hiddenColumns.has(column) ? <EyeSlash size={14} /> : <Eye size={14} />}
                  {column}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download size={16} />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <ArrowsIn size={16} /> : <ArrowsOut size={16} />}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="relative">
        <HeaderRow />
        
        {processedResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No results found
          </div>
        ) : (
          <List
            ref={listRef}
            height={listHeight}
            width="100%"
            itemCount={processedResults.length}
            itemSize={ROW_HEIGHT}
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
}