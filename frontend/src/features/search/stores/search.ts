import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SearchFilter {
  id: string;
  label: string;
  value: string;
  type: "type" | "date" | "status" | "tenant" | "size";
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "database" | "query" | "recent" | "user" | "analytics";
  path: string;
  icon: React.ReactNode;
  metadata?: {
    size?: string;
    nodeCount?: number;
    lastModified?: string;
    status?: "active" | "inactive" | "pending";
    tenant?: string;
    tags?: string[];
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  createdAt: string;
  lastUsed: string;
}

interface SearchState {
  // Current search
  query: string;
  activeFilters: SearchFilter[];
  results: SearchResult[];
  isLoading: boolean;
  totalResults: number;
  
  // Search history
  recentSearches: string[];
  savedSearches: SavedSearch[];
  
  // UI state
  isAdvancedMode: boolean;
  selectedResultId: string | null;
  
  // Facets for filtering
  availableFilters: {
    types: string[];
    statuses: string[];
    tenants: string[];
    dateRanges: string[];
  };
}

interface SearchActions {
  // Search actions
  setQuery: (query: string) => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  setResults: (results: SearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  
  // History actions
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  saveSearch: (name: string) => void;
  deleteSavedSearch: (id: string) => void;
  loadSavedSearch: (id: string) => void;
  
  // UI actions
  setAdvancedMode: (advanced: boolean) => void;
  setSelectedResult: (id: string | null) => void;
  
  // Reset
  reset: () => void;
}

type SearchStore = SearchState & SearchActions;

const initialState: SearchState = {
  query: "",
  activeFilters: [],
  results: [],
  isLoading: false,
  totalResults: 0,
  recentSearches: [],
  savedSearches: [],
  isAdvancedMode: false,
  selectedResultId: null,
  availableFilters: {
    types: ["database", "query", "analytics", "user"],
    statuses: ["active", "inactive", "pending"],
    tenants: ["default", "analytics", "development"],
    dateRanges: ["today", "week", "month", "year"],
  },
};

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Search actions
      setQuery: (query) => {
        set({ query });
        if (query.trim()) {
          get().addRecentSearch(query);
        }
      },

      addFilter: (filter) =>
        set((state) => ({
          activeFilters: [...state.activeFilters.filter(f => f.id !== filter.id), filter],
        })),

      removeFilter: (filterId) =>
        set((state) => ({
          activeFilters: state.activeFilters.filter(f => f.id !== filterId),
        })),

      clearFilters: () => set({ activeFilters: [] }),

      setResults: (results) => set({ 
        results, 
        totalResults: results.length,
        isLoading: false 
      }),

      setLoading: (isLoading) => set({ isLoading }),

      // History actions
      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter(q => q !== query)
          ].slice(0, 10), // Keep only last 10 searches
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),

      saveSearch: (name) => {
        const state = get();
        const savedSearch: SavedSearch = {
          id: `search_${Date.now()}`,
          name,
          query: state.query,
          filters: state.activeFilters,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };

        set((state) => ({
          savedSearches: [...state.savedSearches, savedSearch],
        }));
      },

      deleteSavedSearch: (id) =>
        set((state) => ({
          savedSearches: state.savedSearches.filter(s => s.id !== id),
        })),

      loadSavedSearch: (id) => {
        const state = get();
        const savedSearch = state.savedSearches.find(s => s.id === id);
        
        if (savedSearch) {
          set({
            query: savedSearch.query,
            activeFilters: savedSearch.filters,
          });

          // Update last used timestamp
          set((state) => ({
            savedSearches: state.savedSearches.map(s =>
              s.id === id
                ? { ...s, lastUsed: new Date().toISOString() }
                : s
            ),
          }));
        }
      },

      // UI actions
      setAdvancedMode: (isAdvancedMode) => set({ isAdvancedMode }),

      setSelectedResult: (selectedResultId) => set({ selectedResultId }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: "search-storage",
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        savedSearches: state.savedSearches,
        isAdvancedMode: state.isAdvancedMode,
      }),
    }
  )
);