import { useState, useEffect } from "react";
import { Database } from "@phosphor-icons/react";
import { useDatabases } from "@/shared/hooks/useApi";
import { cn } from "@/shared/lib";

export function DatabaseSidebar() {
  const [selectedDb, setSelectedDb] = useState<string>("");
  const { data: databases = [], isLoading } = useDatabases();
  
  // Auto-select first database on mount
  useEffect(() => {
    if (!selectedDb && databases.length > 0) {
      setSelectedDb(databases[0].id);
    }
  }, [databases, selectedDb]);

  const selectedDatabase = databases.find((db: any) => db.id === selectedDb);

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Databases</h3>
        </div>
      </div>

      {/* Database List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Loading...</p>
          </div>
        ) : databases.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No databases</p>
          </div>
        ) : (
          databases.map((db: any) => (
            <button
              key={db.id}
              onClick={() => setSelectedDb(db.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                selectedDb === db.id
                  ? "bg-blue-50 border border-blue-200 shadow-sm"
                  : "border border-gray-100 hover:border-gray-200 hover:bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm truncate",
                    selectedDb === db.id ? "text-blue-900" : "text-gray-900"
                  )}>
                    {db.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {db.sizeBytes ? `${(db.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '0 MB'}
                  </p>
                </div>
                {selectedDb === db.id && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1"></div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* PITR Section removed intentionally – handled in vertical timeline on Dashboard */}
    </div>
  );
}
