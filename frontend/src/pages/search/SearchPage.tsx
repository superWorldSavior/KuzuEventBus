import { AdvancedSearch } from "@/features/search/components/AdvancedSearch";
import { SearchResults } from "@/features/search/components/SearchResults";
import { SearchResult } from "@/features/search/stores/search";

export function SearchPage() {
  const handleResultSelect = (result: SearchResult) => {
    // Additional handling if needed - could be used for analytics, etc.
    console.log("Selected result:", result);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search
          </h1>
          <p className="text-gray-600">
            Find databases, queries, analytics, and more across your workspace
          </p>
        </div>

        {/* Search Interface */}
        <div className="space-y-8">
          {/* Advanced Search Component */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <AdvancedSearch
              placeholder="Search databases, queries, analytics..."
              showSaveSearch={true}
              onResultSelect={handleResultSelect}
            />
          </div>

          {/* Search Results */}
          <SearchResults
            onResultSelect={handleResultSelect}
          />
        </div>
      </div>
    </div>
  );
}

SearchPage.displayName = "SearchPage";