import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  DotsThree,
  Database,
} from "@phosphor-icons/react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/utils";

interface QueryResult {
  id: string;
  query: string;
  status: "success" | "error" | "running";
  executionTime?: number;
  createdAt: Date | string; // Can be either Date object or ISO string
  database: string;
  resultCount?: number;
}

interface RecentQueriesWidgetProps {
  queries?: QueryResult[];
  isLoading?: boolean;
  onQueryClick?: (queryId: string) => void;
  onRunQuery?: (query: string) => void;
  className?: string;
}

export function RecentQueriesWidget({
  queries,
  isLoading = false,
  onQueryClick,
  onRunQuery,
  className,
}: RecentQueriesWidgetProps) {
  // Mock data for development
  const mockQueries: QueryResult[] = [
    {
      id: "1",
      query: "MATCH (n:Person) RETURN n.name LIMIT 10",
      status: "success",
      executionTime: 45,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      database: "social-network",
      resultCount: 8,
    },
    {
      id: "2",
      query:
        "MATCH (a:Person)-[:KNOWS]->(b:Person) WHERE a.name = 'Alice' RETURN b",
      status: "success",
      executionTime: 123,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      database: "social-network",
      resultCount: 3,
    },
    {
      id: "3",
      query: "MATCH (n) RETURN COUNT(n)",
      status: "error",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      database: "inventory-db",
    },
    {
      id: "4",
      query:
        "MATCH (p:Product) WHERE p.price > 100 RETURN p.name, p.price ORDER BY p.price DESC",
      status: "running",
      createdAt: new Date(Date.now() - 1000 * 30).toISOString(), // 30 seconds ago
      database: "ecommerce-db",
    },
  ];

  const queriesData = queries || mockQueries;

  const getStatusIcon = (status: QueryResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return (
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: QueryResult["status"]) => {
    switch (status) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      case "running":
        return "text-blue-700 bg-blue-50 border-blue-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white rounded-lg border border-gray-200 p-6",
          className
        )}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Queries
        </h3>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-gray-200 rounded-full mt-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Queries</h3>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
          View all
        </button>
      </div>

      {/* Queries List */}
      <div className="space-y-4">
        {queriesData.map((query) => (
          <div
            key={query.id}
            className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onQueryClick?.(query.id)}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(query.status)}
            </div>

            {/* Query Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-mono truncate">
                    {query.query}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {query.database}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(
                        typeof query.createdAt === "string"
                          ? parseISO(query.createdAt)
                          : query.createdAt,
                        {
                          addSuffix: true,
                        }
                      )}
                    </span>
                    {query.executionTime && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {query.executionTime}ms
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center space-x-2 ml-2">
                  {query.resultCount !== undefined && (
                    <span className="text-xs text-gray-500">
                      {query.resultCount} results
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex px-2 py-1 text-xs font-medium rounded-full border",
                      getStatusColor(query.status)
                    )}
                  >
                    {query.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunQuery?.(query.query);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Run query"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="More actions"
                >
                  <DotsThree className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {queriesData.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No recent queries</p>
        </div>
      )}
    </div>
  );
}

RecentQueriesWidget.displayName = "RecentQueriesWidget";
