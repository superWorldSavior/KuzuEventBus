// Query History Component with filtering and pagination
import { useState, useMemo } from "react";
import {
  Clock,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Spinner,
  Play,
  Database,
  Calendar,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { LoadingSkeleton } from "@/shared/ui/LoadingSkeleton";
import { cn } from "@/shared/lib";
import { useQueryHistory } from "../hooks/useQueries";
import type { Query, QueryStatus } from "@/entities/query";

interface QueryHistoryProps {
  databaseId?: string;
  limit?: number;
  onQuerySelect?: (query: Query) => void;
  onRunQuery?: (queryContent: string) => void;
  className?: string;
}

const statusColors: Record<QueryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  timeout: "bg-orange-100 text-orange-800",
};

const statusIcons: Record<QueryStatus, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  running: <Spinner className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  timeout: <Clock className="h-3 w-3" />,
};

export function QueryHistory({
  databaseId,
  limit = 50,
  onQuerySelect,
  onRunQuery,
  className,
}: QueryHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QueryStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "durationMs">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const {
    data: queries = [],
    isLoading,
    error,
    refetch
  } = useQueryHistory(databaseId || "", limit);

  // Filter and sort queries
  const filteredQueries = useMemo(() => {
    let filtered = queries;

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = queries.filter(query =>
        query.content.toLowerCase().includes(searchLower) ||
        query.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(query => query.status === statusFilter);
    }

    // Sort queries
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortBy === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else if (sortBy === "durationMs") {
        aValue = a.durationMs || 0;
        bValue = b.durationMs || 0;
      }

      if (sortOrder === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [queries, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleQueryClick = (query: Query) => {
    onQuerySelect?.(query);
  };

  const handleRunQuery = (queryContent: string) => {
    onRunQuery?.(queryContent);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!databaseId) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a database to view query history</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardHeader>
            <CardTitle>Query History</CardTitle>
            <CardDescription>Recent queries for this database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <LoadingSkeleton variant="card" height="80px" />
              <LoadingSkeleton variant="card" height="80px" />
              <LoadingSkeleton variant="card" height="80px" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive">Failed to load query history</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Query History</CardTitle>
          <CardDescription>
            {queries.length} {queries.length === 1 ? 'query' : 'queries'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as QueryStatus | "all")}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="timeout">Timeout</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as "createdAt" | "durationMs");
                  setSortOrder(order as "asc" | "desc");
                }}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="durationMs-desc">Slowest First</option>
                <option value="durationMs-asc">Fastest First</option>
              </select>
            </div>
          </div>

          {/* Query list */}
          {filteredQueries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MagnifyingGlass className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No queries found</p>
              {searchQuery || statusFilter !== "all" ? (
                <p className="text-sm">Try adjusting your search or filters</p>
              ) : (
                <p className="text-sm">Run your first query to see it here</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQueries.map((query) => (
                <div
                  key={query.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleQueryClick(query)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("flex items-center gap-1", statusColors[query.status])}>
                          {statusIcons[query.status]}
                          {query.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(query.durationMs)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(query.createdAt)}
                        </span>
                      </div>
                      
                      <div className="text-sm font-mono bg-muted p-2 rounded text-foreground/80 truncate">
                        {query.content}
                      </div>
                      
                      {query.errorMessage && (
                        <div className="mt-2 text-xs text-destructive">
                          Error: {query.errorMessage}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunQuery(query.content);
                        }}
                        className="h-8 w-8 p-0"
                        title="Run this query"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}