import { useState } from "react";
import {
  MagnifyingGlass,
  Funnel,
  X,
  Bookmark,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useSearch } from "@/hooks/useSearch";
import { SearchFilter } from "@/store/search";

interface AdvancedSearchProps {
  className?: string;
  placeholder?: string;
  showSaveSearch?: boolean;
  onResultSelect?: (result: any) => void;
}

const filterOptions = {
  type: [
    { value: "database", label: "Databases" },
    { value: "query", label: "Queries" },
    { value: "analytics", label: "Analytics" },
    { value: "user", label: "Users" },
  ],
  status: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
  ],
  tenant: [
    { value: "default", label: "Default" },
    { value: "analytics", label: "Analytics" },
    { value: "development", label: "Development" },
  ],
  date: [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
  ],
};

export function AdvancedSearch({
  className,
  placeholder = "Search across all content...",
  showSaveSearch = true,
}: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  const {
    query,
    activeFilters,
    recentSearches,
    savedSearches,
    search,
    addFilter,
    removeFilter,
    clearFilters,
    clearSearch,
    saveCurrentSearch,
    hasActiveFilters,
  } = useSearch();

  const handleAddFilter = (type: string, value: string, label: string) => {
    const filter: SearchFilter = {
      id: `${type}-${value}`,
      label,
      value,
      type: type as SearchFilter["type"],
    };
    addFilter(filter);
  };

  const handleSaveSearch = () => {
    if (saveSearchName.trim()) {
      saveCurrentSearch(saveSearchName.trim());
      setSaveSearchName("");
      setShowSaveDialog(false);
    }
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    search(recentQuery);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input with Controls */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlass className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg",
                "text-sm bg-white placeholder-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "transition-all duration-200"
              )}
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 border rounded-lg transition-colors",
              showFilters || hasActiveFilters
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Funnel className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Save Search */}
          {showSaveSearch && query && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              <span className="text-sm font-medium">Save</span>
            </button>
          )}
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center space-x-2 mt-3">
            <span className="text-sm text-gray-500">Active filters:</span>
            {activeFilters.map((filter) => (
              <span
                key={filter.id}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
              >
                <span>{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Search Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(filterOptions).map(([filterType, options]) => (
              <div key={filterType}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {filterType}
                </label>
                <div className="space-y-1">
                  {options.map((option) => {
                    const isActive = activeFilters.some(
                      f => f.type === filterType && f.value === option.value
                    );
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (isActive) {
                            removeFilter(`${filterType}-${option.value}`);
                          } else {
                            handleAddFilter(filterType, option.value, option.label);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                          isActive
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches & Saved Searches */}
      {!query && (recentSearches.length > 0 || savedSearches.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {recentSearches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recent Searches
              </h3>
              <div className="space-y-1">
                {recentSearches.slice(0, 5).map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-between"
                  >
                    <span>{recentQuery}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {savedSearches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Bookmark className="w-4 h-4 mr-2" />
                Saved Searches
              </h3>
              <div className="space-y-1">
                {savedSearches.slice(0, 5).map((savedSearch) => (
                  <button
                    key={savedSearch.id}
                    onClick={() => search(savedSearch.query)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{savedSearch.name}</div>
                      <div className="text-xs text-gray-500">{savedSearch.query}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Search</h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Enter search name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AdvancedSearch.displayName = "AdvancedSearch";