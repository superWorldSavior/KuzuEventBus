import { useState } from "react";
import { Database, ClockCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useDatabases } from "@/shared/hooks/useApi";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/shared/lib";

export function DatabaseSidebar() {
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [targetTimestamp, setTargetTimestamp] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);
  const { data: databases = [], isLoading } = useDatabases();
  const { toast } = useToast();

  const selectedDatabase = databases.find((db: any) => db.id === selectedDb);

  const handleRestore = async () => {
    if (!selectedDb || !targetTimestamp) {
      toast.error("Select a timestamp to restore");
      return;
    }

    setIsRestoring(true);
    try {
      await apiClient.post(
        `/api/v1/databases/${selectedDb}/restore-pitr?target_timestamp=${encodeURIComponent(targetTimestamp)}`
      );
      
      toast.success(`✅ Database restored to ${targetTimestamp}`);
      setTargetTimestamp("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message);
    } finally {
      setIsRestoring(false);
    }
  };

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

      {/* PITR Section */}
      {selectedDb && selectedDatabase && (
        <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
          <div className="flex items-center gap-2">
            <ClockCounterClockwise className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-xs uppercase text-gray-600">Time Travel</h4>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Now</span>
            </div>
            
            <input
              type="datetime-local"
              value={targetTimestamp.replace(":00Z", "")}
              onChange={(e) => setTargetTimestamp(e.target.value + ":00Z")}
              className="w-full text-xs px-2 py-1.5 border rounded"
              placeholder="Select restore point"
            />
          </div>

          {targetTimestamp && (
            <Button
              onClick={handleRestore}
              disabled={isRestoring}
              className="w-full"
              size="sm"
            >
              <ClockCounterClockwise className="w-3 h-3 mr-1" />
              {isRestoring ? "Restoring..." : "Restore"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
