import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchStore, SearchResult, SearchFilter } from "../stores/search";

interface UseSearchOptions {
  enabled?: boolean;
  maxResults?: number;
}

interface UseSearchReturn {
  // Data
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  totalResults: number;
  
  // Search state
  query: string;
  activeFilters: SearchFilter[];
  recentSearches: string[];
  savedSearches: any[];
  
  // Actions
  search: (query: string) => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  saveCurrentSearch: (name: string) => void;
  
  // Utils
  hasActiveFilters: boolean;
  filteredResults: SearchResult[];
}

// Mock API function - would be replaced with actual API call
const mockSearchAPI = async (query: string, filters: SearchFilter[]): Promise<SearchResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const mockData: SearchResult[] = [
    {
      id: "db-1",
      title: "user-analytics",
      subtitle: "Database • 2.3 GB • 45k nodes",
      type: "database",
      path: "/databases/user-analytics",
      icon: null, // Will be set by component
      metadata: {
        size: "2.3 GB",
        nodeCount: 45000,
        lastModified: "2025-09-18T10:30:00Z",
        status: "active",
        tenant: "analytics",
        tags: ["users", "analytics", "production"],
      },
    },
    {
      id: "db-2",
      title: "product-catalog",
      subtitle: "Database • 1.8 GB • 32k nodes",
      type: "database",
      path: "/databases/product-catalog",
      icon: null,
      metadata: {
        size: "1.8 GB",
        nodeCount: 32000,
        lastModified: "2025-09-17T14:20:00Z",
        status: "active",
        tenant: "default",
        tags: ["products", "catalog", "e-commerce"],
      },
    },
    {
      id: "query-1",
      title: "Customer Segmentation Analysis",
      subtitle: "Query • Last run 2 hours ago",
      type: "query",
      path: "/queries/customer-segmentation",
      icon: null,
      metadata: {
        lastModified: "2025-09-18T08:15:00Z",
        status: "active",
        tenant: "analytics",
        tags: ["customers", "segmentation", "marketing"],
      },
    },
    {
      id: "query-2",
      title: "Product Recommendation Engine",
      subtitle: "Query • Last run yesterday",
      type: "query",
      path: "/queries/product-recommendations",
      icon: null,
      metadata: {
        lastModified: "2025-09-17T16:45:00Z",
        status: "active",
        tenant: "default",
        tags: ["recommendations", "ml", "products"],
      },
    },
    {
      id: "analytics-1",
      title: "Monthly Sales Report",
      subtitle: "Analytics • Generated this morning",
      type: "analytics",
      path: "/analytics/monthly-sales",
      icon: null,
      metadata: {
        lastModified: "2025-09-18T09:00:00Z",
        status: "active",
        tenant: "analytics",
        tags: ["sales", "reports", "monthly"],
      },
    },
  ];

  // Filter by query
  let filtered = mockData.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      (item.metadata?.tags || []).some((tag: string) => 
        tag.toLowerCase().includes(query.toLowerCase())
      )
  );

  // Apply filters
  filters.forEach(filter => {
    switch (filter.type) {
      case "type":
        filtered = filtered.filter(item => item.type === filter.value);
        break;
      case "status":
        filtered = filtered.filter(item => item.metadata?.status === filter.value);
        break;
      case "tenant":
        filtered = filtered.filter(item => item.metadata?.tenant === filter.value);
        break;
      case "date":
        // Simple date filtering - in real app would be more sophisticated
        const now = new Date();
        const filterDate = new Date(now);
        
        switch (filter.value) {
          case "today":
            filterDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            filterDate.setDate(now.getDate() - 7);
            break;
          case "month":
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case "year":
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        filtered = filtered.filter(item => {
          if (!item.metadata?.lastModified) return false;
          return new Date(item.metadata.lastModified) >= filterDate;
        });
        break;
    }
  });

  return filtered;
};

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    enabled = true,
    maxResults = 50,
  } = options;

  const {
    query,
    activeFilters,
    results,
    isLoading,
    totalResults,
    recentSearches,
    savedSearches,
    setQuery,
    addFilter,
    removeFilter,
    clearFilters,
    setResults,
    setLoading,
    saveSearch,
  } = useSearchStore();

  // Create search query key
  const queryKey = useMemo(() => [
    "search",
    query,
    activeFilters.map((f: SearchFilter) => `${f.type}:${f.value}`).join(","),
  ], [query, activeFilters]);

  // Debounced search query
  const { data, error, isLoading: queryLoading } = useQuery({
    queryKey,
    queryFn: () => mockSearchAPI(query, activeFilters),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Update store when query data changes
  useEffect(() => {
    if (data) {
      setResults(data.slice(0, maxResults));
    }
  }, [data, maxResults, setResults]);

  // Update loading state
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  // Search function
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, [setQuery]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("");
    clearFilters();
    setResults([]);
  }, [setQuery, clearFilters, setResults]);

  // Save current search
  const saveCurrentSearch = useCallback((name: string) => {
    if (query.trim()) {
      saveSearch(name);
    }
  }, [query, saveSearch]);

  // Filter results based on client-side filtering if needed
  const filteredResults = useMemo(() => {
    // In this implementation, filtering is done server-side (in mockSearchAPI)
    // But this could be used for additional client-side filtering
    return results;
  }, [results]);

  // Check if there are active filters
  const hasActiveFilters = activeFilters.length > 0;

  return {
    // Data
    results: filteredResults,
    isLoading: queryLoading || isLoading,
    error,
    totalResults,
    
    // Search state
    query,
    activeFilters,
    recentSearches,
    savedSearches,
    
    // Actions
    search,
    addFilter,
    removeFilter,
    clearFilters,
    clearSearch,
    saveCurrentSearch,
    
    // Utils
    hasActiveFilters,
    filteredResults,
  };
}