import { useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useToast } from "@/shared/hooks/use-toast";
import { useDatabases } from "@/shared/hooks/useApi";
import { apiClient } from "@/shared/api/client";

export function SimplePITRControl() {
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [targetTimestamp, setTargetTimestamp] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);
  const { data: databases = [] } = useDatabases();
  const { toast } = useToast();

  const handleRestore = async () => {
    if (!selectedDb || !targetTimestamp) {
      toast({
        title: "Missing information",
        description: "Please select a database and timestamp",
        variant: "destructive",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const response = await apiClient.post(
        `/api/v1/databases/${selectedDb}/restore-pitr?target_timestamp=${encodeURIComponent(targetTimestamp)}`
      );
      
      toast({
        title: "✅ PITR Restore Successful",
        description: `Database restored to ${targetTimestamp}. Snapshot: ${response.data.snapshot_used}, WAL files: ${response.data.wal_files_replayed}`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Restore Failed",
        description: error.response?.data?.detail || error.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <ClockCounterClockwise className="w-6 h-6 text-blue-500" />
        <div>
          <h3 className="text-lg font-semibold">Point-In-Time Restore</h3>
          <p className="text-sm text-muted-foreground">
            Restore any database to a previous state
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Database selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Database</label>
          <select
            value={selectedDb}
            onChange={(e) => setSelectedDb(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="">-- Choose a database --</option>
            {databases.map((db: any) => (
              <option key={db.id} value={db.id}>
                {db.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timestamp picker */}
        <div>
          <label className="text-sm font-medium mb-2 block">Target Timestamp</label>
          <input
            type="datetime-local"
            value={targetTimestamp}
            onChange={(e) => setTargetTimestamp(e.target.value + ":00Z")}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Select when you want to restore the database to
          </p>
        </div>

        {/* Restore button */}
        <Button
          onClick={handleRestore}
          disabled={!selectedDb || !targetTimestamp || isRestoring}
          className="w-full"
          size="lg"
        >
          <ClockCounterClockwise className="w-4 h-4 mr-2" />
          {isRestoring ? "Restoring..." : "Restore Database"}
        </Button>
      </div>
    </Card>
  );
}
