import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass,
  Database,
  Code,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/utils";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "database" | "query" | "recent";
  path: string;
  icon: React.ReactNode;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
}

// Mock search results - would come from API in real app
const mockSearchResults: SearchResult[] = [
  {
    id: "db-1",
    title: "user-analytics",
    subtitle: "Database • 2.3 GB • 45k nodes",
    type: "database",
    path: "/databases/user-analytics",
    icon: <Database className="w-4 h-4 text-blue-500" />,
  },
  {
    id: "db-2",
    title: "product-catalog",
    subtitle: "Database • 1.8 GB • 32k nodes",
    type: "database",
    path: "/databases/product-catalog",
    icon: <Database className="w-4 h-4 text-blue-500" />,
  },
  {
    id: "query-1",
    title: "Customer Segmentation Analysis",
    subtitle: "Query • Last run 2 hours ago",
    type: "query",
    path: "/queries/customer-segmentation",
    icon: <Code className="w-4 h-4 text-green-500" />,
  },
  {
    id: "query-2",
    title: "Product Recommendation Engine",
    subtitle: "Query • Last run yesterday",
    type: "query",
    path: "/queries/product-recommendations",
    icon: <Code className="w-4 h-4 text-green-500" />,
  },
  {
    id: "recent-1",
    title: "Monthly Sales Report",
    subtitle: "Recent search • Viewed 1 hour ago",
    type: "recent",
    path: "/analytics/monthly-sales",
    icon: <Clock className="w-4 h-4 text-gray-500" />,
  },
];

export function SearchBar({ className, placeholder = "Search databases, queries...", onResultSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Filter results based on query
  useEffect(() => {
    if (query.trim()) {
      const filtered = mockSearchResults.filter(
        (result) =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.subtitle.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(-1);
    } else {
      setResults([]);
    }
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : -1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, results, selectedIndex]);

  const handleResultSelect = (result: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    onResultSelect?.(result);
    navigate(result.path);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.trim().length > 0);
  };

  const handleInputFocus = () => {
    if (query.trim()) {
      setIsOpen(true);
    }
  };

  return (
    <div className={cn("relative w-full max-w-lg", className)} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlass className="w-4 h-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn(
            "block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg",
            "text-sm placeholder-gray-500 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "transition-all duration-200"
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleResultSelect(result)}
              className={cn(
                "w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 transition-colors",
                "border-b border-gray-100 last:border-b-0",
                index === selectedIndex && "bg-blue-50 border-blue-200"
              )}
              role="option"
              aria-selected={index === selectedIndex}
            >
              {/* Icon */}
              <div className="flex-shrink-0">{result.icon}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {result.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}

          {/* No results footer */}
          {query && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-center text-gray-500">
                Press Enter to search for "{query}" across all content
              </p>
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="text-center">
            <MagnifyingGlass className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-1">No results found for "{query}"</p>
            <p className="text-xs text-gray-400">
              Try adjusting your search terms or browse all content
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

SearchBar.displayName = "SearchBar";