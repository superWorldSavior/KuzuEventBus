import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Code,
  ChartBar,
  User,
  Calendar,
  Tag,
  ArrowRight,
  MagnifyingGlass,
  Funnel,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { useSearch } from "../hooks/useSearch";
import { SearchResult } from "../stores/search";

interface SearchResultsProps {
  className?: string;
  showFilters?: boolean;
  onResultSelect?: (result: SearchResult) => void;
}

const iconMap = {
  database: <Database className="w-4 h-4 text-blue-500" />,
  query: <Code className="w-4 h-4 text-green-500" />,
  analytics: <ChartBar className="w-4 h-4 text-purple-500" />,
  user: <User className="w-4 h-4 text-orange-500" />,
  recent: <Calendar className="w-4 h-4 text-gray-500" />,
};

export function SearchResults({
  className,
  onResultSelect,
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">("relevance");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const navigate = useNavigate();

  const {
    query,
    results,
    isLoading,
    totalResults,
    activeFilters,
    hasActiveFilters,
  } = useSearch();

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    navigate(result.path);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "date":
        const dateA = new Date(a.metadata?.lastModified || 0);
        const dateB = new Date(b.metadata?.lastModified || 0);
        return dateB.getTime() - dateA.getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "relevance":
      default:
        return 0; // Keep original order (relevance-based from search)
    }
  });

  if (!query) {
    return (
      <div className={cn("text-center py-12", className)}>
        <MagnifyingGlass className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Start searching to see results
        </h3>
        <p className="text-gray-500">
          Enter a search term to find databases, queries, and analytics
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Loading skeleton */}
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex space-x-2">
                  <div className="h-2 bg-gray-200 rounded w-16" />
                  <div className="h-2 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Search Results
            {totalResults > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({totalResults.toLocaleString()} {totalResults === 1 ? "result" : "results"})
              </span>
            )}
          </h2>
          {query && (
            <p className="text-sm text-gray-500 mt-1">
              Results for "{query}"
              {hasActiveFilters && (
                <span className="ml-1">
                  with {activeFilters.length} {activeFilters.length === 1 ? "filter" : "filters"}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Sort and View Controls */}
        {results.length > 0 && (
          <div className="flex items-center space-x-4">
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-500">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date Modified</option>
                <option value="title">Title</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2 py-1 text-sm rounded-l-md transition-colors",
                  viewMode === "list"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2 py-1 text-sm rounded-r-md transition-colors",
                  viewMode === "grid"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                Grid
              </button>
            </div>
          </div>
        )}
      </div>

      {/* No Results */}
      {results.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <MagnifyingGlass className="w-12 h-12 text-gray-300" />
              <Funnel className="w-6 h-6 text-gray-400 absolute -top-1 -right-1" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No results found
          </h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search terms or removing some filters
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => window.location.reload()} // This will clear filters via store
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results List/Grid */}
      {results.length > 0 && (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          )}
        >
          {sortedResults.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className={cn(
                "w-full text-left bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all",
                viewMode === "grid" ? "p-4" : "p-4"
              )}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {iconMap[result.type as keyof typeof iconMap] || iconMap.database}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate mb-1">
                    {result.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {result.subtitle}
                  </p>

                  {/* Metadata */}
                  {result.metadata && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      {result.metadata.lastModified && (
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(result.metadata.lastModified)}
                        </span>
                      )}
                      {result.metadata.size && (
                        <span>{result.metadata.size}</span>
                      )}
                      {result.metadata.nodeCount && (
                        <span>{result.metadata.nodeCount.toLocaleString()} nodes</span>
                      )}
                      {result.metadata.status && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-xs font-medium",
                            result.metadata.status === "active"
                              ? "bg-green-100 text-green-700"
                              : result.metadata.status === "inactive"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {result.metadata.status}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {result.metadata?.tags && result.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <Tag className="w-3 h-3 text-gray-400" />
                      {result.metadata.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {result.metadata.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{result.metadata.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

SearchResults.displayName = "SearchResults";