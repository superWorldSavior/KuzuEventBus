import { useState, useRef, useEffect } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSearchModal({ isOpen, onClose }: MobileSearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      console.log("Searching for:", query);
      // Implement search functionality here
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative bg-white h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex-1 flex items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlass className="w-5 h-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search databases, queries..."
                className="block w-full pl-10 pr-4 py-3 text-lg border-0 focus:outline-none focus:ring-0"
              />
            </div>
          </form>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Search content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {query ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Search Results for "{query}"
              </h3>
              
              {/* Mock search results */}
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">Customer Database</div>
                  <div className="text-sm text-gray-600">Database • Updated 2 days ago</div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">User Analysis Query</div>
                  <div className="text-sm text-gray-600">Query • Executed yesterday</div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">Product Relationships</div>
                  <div className="text-sm text-gray-600">Query Template • Last week</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recent searches */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Recent Searches
                </h3>
                <div className="space-y-2">
                  {[
                    "customer database",
                    "user relationships",
                    "product analytics"
                  ].map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(term)}
                      className="flex items-center space-x-3 p-2 w-full text-left rounded-lg hover:bg-gray-50"
                    >
                      <MagnifyingGlass className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{term}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={onClose}
                    className="flex items-center space-x-3 p-2 w-full text-left rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-gray-700">Create new database</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex items-center space-x-3 p-2 w-full text-left rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-gray-700">Run new query</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex items-center space-x-3 p-2 w-full text-left rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-gray-700">View analytics</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

MobileSearchModal.displayName = "MobileSearchModal";