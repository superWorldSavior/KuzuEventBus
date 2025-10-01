import { useState } from "react";
import { ClockCounterClockwise, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useDatabases } from "@/shared/hooks/useApi";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/shared/lib";

export function PITRTimeline() {
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);
  const [targetTimestamp, setTargetTimestamp] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);
  const { data: databases = [] } = useDatabases();
  const { success, error } = useToast();

  const handleRestore = async () => {
    if (!selectedDb || !targetTimestamp) {
      error({
        title: "Missing information",
        description: "Please select a database and timestamp",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const response = await apiClient.post(
        `/api/v1/databases/${selectedDb}/restore-pitr?target_timestamp=${encodeURIComponent(targetTimestamp)}`
      );
      
      success({
        title: "✅ Restored",
        description: `Database restored to ${targetTimestamp}`,
      });
      setShowPicker(false);
    } catch (err: any) {
      error({
        title: "❌ Restore Failed",
        description: err.response?.data?.detail || err.message,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const selectedDbName = databases.find((db: any) => db.id === selectedDb)?.name || "Select database";

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <ClockCounterClockwise className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-sm">Time Travel</h3>
      </div>

      {/* Database Selector */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full px-3 py-2 text-sm border rounded-md bg-white flex items-center justify-between hover:bg-gray-50"
        >
          <span className="truncate">{selectedDbName}</span>
          <CaretDown className="w-4 h-4 text-gray-500" />
        </button>
        
        {showPicker && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
            {databases.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No databases found</div>
            ) : (
              databases.map((db: any) => (
                <button
                  key={db.id}
                  onClick={() => {
                    setSelectedDb(db.id);
                    setShowPicker(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left hover:bg-blue-50",
                    selectedDb === db.id && "bg-blue-100 font-medium"
                  )}
                >
                  {db.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Timeline - Vertical */}
      {selectedDb && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-gray-500 uppercase">Timeline</div>
          
          {/* Current state */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100"></div>
              <div className="w-0.5 h-12 bg-gray-200"></div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="text-sm font-medium">Now</div>
              <div className="text-xs text-gray-500">Current state</div>
            </div>
          </div>

          {/* Restore point */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100"></div>
            </div>
            <div className="flex-1 -mt-1">
              <input
                type="datetime-local"
                value={targetTimestamp.replace(":00Z", "")}
                onChange={(e) => setTargetTimestamp(e.target.value + ":00Z")}
                className="w-full text-xs px-2 py-1 border rounded"
              />
              <div className="text-xs text-gray-500 mt-1">Restore to this point</div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Button */}
      {selectedDb && targetTimestamp && (
        <Button
          onClick={handleRestore}
          disabled={isRestoring}
          className="w-full"
          size="sm"
        >
          <ClockCounterClockwise className="w-4 h-4 mr-2" />
          {isRestoring ? "Restoring..." : "Restore"}
        </Button>
      )}
    </div>
  );
}
