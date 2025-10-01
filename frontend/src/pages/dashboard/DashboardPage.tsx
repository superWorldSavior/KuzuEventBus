import { useState, useEffect } from "react";
import { Camera, CircleDashed } from "@phosphor-icons/react";
import { useDatabases } from "@/features/database-management/hooks/useDatabases";
import { useDatabaseSnapshots } from "@/shared/hooks/useApi";
import { queryApi } from "@/features/query-execution/services/queryApi";
import { cn } from "@/shared/lib";
import { GraphView } from "@/features/graph/components/GraphView";
import { QueryEditor } from "@/features/graph/components/QueryEditor";

export function DashboardPage() {
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [graphKey, setGraphKey] = useState(0); // Force graph refresh

  // Fetch databases
  const { data: databases = [] } = useDatabases();
  const snapshotsQuery = useDatabaseSnapshots(selectedDbId || '');
  const snapshots: Array<{ id: string; created_at: string }> = snapshotsQuery.data ?? [];

  // Listen to SSE events via window custom events
  useEffect(() => {
    console.log('👂 [Dashboard] Listening for SSE events, pendingTxId:', pendingTxId);
    const handleSSEEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log('📨 [Dashboard] Received SSE event:', data, 'pending:', pendingTxId);
      
      // Check if it's for our pending query
      if (data.transaction_id === pendingTxId) {
        console.log('✅ [Dashboard] SSE event matches our query:', data);
        
        // Cancel the fallback timeout
        const timeoutId = (window as any)[`timeout_${data.transaction_id}`];
        if (timeoutId) {
          clearTimeout(timeoutId);
          delete (window as any)[`timeout_${data.transaction_id}`];
        }
        
        if (data.event_type === 'completed') {
          console.log('Query completed via SSE');
          setPendingTxId(null);
          setIsExecuting(false);
          // Wait a bit for cache then refresh graph
          setTimeout(() => setGraphKey(prev => prev + 1), 300);
        } else if (data.event_type === 'failed' || data.event_type === 'timeout') {
          console.error('Query failed/timeout:', data.error);
          setPendingTxId(null);
          setIsExecuting(false);
        }
      }
    };

    window.addEventListener('sse:event', handleSSEEvent);
    return () => window.removeEventListener('sse:event', handleSSEEvent);
  }, [pendingTxId]);

  // Auto-select first DB
  useEffect(() => {
    if (databases.length > 0 && !selectedDbId) {
      setSelectedDbId(databases[0].id);
    }
  }, [databases, selectedDbId]);

  // const selectedDb = databases.find(db => db.id === selectedDbId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const handleExecuteQuery = async (query: string) => {
    if (!selectedDbId) return;

    try {
      setIsExecuting(true);
      // Submit query and get transaction id
      const result = await queryApi.submitQuery(selectedDbId, { query });
      const txId: string | undefined = result?.transaction_id;

      if (!txId) {
        console.error("No transaction_id returned");
        setIsExecuting(false);
        return;
      }

      console.log("Query submitted, waiting for SSE event...", txId);
      // Store transaction ID to match SSE event later
      setPendingTxId(txId);
      
      // Fallback timeout: if no SSE event after 10s, refresh anyway
      const timeoutId = setTimeout(() => {
        console.warn("⏱️ SSE timeout (10s) - refreshing graph anyway");
        setPendingTxId(null);
        setIsExecuting(false);
        setGraphKey(prev => prev + 1);
      }, 10000);
      
      // Store timeout ID to cancel if SSE arrives
      (window as any)[`timeout_${txId}`] = timeoutId;
      
    } catch (error) {
      console.error("Failed to execute query:", error);
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Timeline Sidebar (vertical GitHub-style branches) */}
      <div className="w-16 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 space-y-3">
        {/* Current state */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all",
            !selectedSnapshotId ? "bg-green-100 ring-2 ring-green-500" : "bg-green-50 hover:bg-green-100"
          )}
          onClick={() => setSelectedSnapshotId(null)}
          title="Current state"
        >
          <CircleDashed size={20} className="text-green-600" />
        </div>
        {/* Vertical line */}
        {snapshots.length > 0 && <div className="w-px h-8 bg-gray-300" />}
        {/* Snapshots */}
        {snapshots.map((snapshot: { id: string; created_at: string }, idx: number) => (
          <div key={snapshot.id} className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all",
                selectedSnapshotId === snapshot.id ? "bg-blue-100 ring-2 ring-blue-500" : "bg-blue-50 hover:bg-blue-100"
              )}
              onClick={() => setSelectedSnapshotId(snapshot.id)}
              title={`Snapshot: ${formatDate(snapshot.created_at)}`}
            >
              <Camera size={16} className="text-blue-600" />
            </div>
            {idx < snapshots.length - 1 && <div className="w-px h-8 bg-gray-300 my-1" />}
          </div>
        ))}
      </div>

      {/* Main Content - Graph Viewer (Fixed height, no scroll) */}
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50 overflow-hidden">
        {/* Query Editor - Fixed height */}
        <div className="flex-shrink-0 px-4 pt-4">
          <QueryEditor databaseId={selectedDbId} onExecute={handleExecuteQuery} isExecuting={isExecuting} />
        </div>

        <div className="flex-1 px-4 pb-0 min-h-0">
          <GraphView key={graphKey} databaseId={selectedDbId} snapshotId={selectedSnapshotId} />
        </div>
      </div>
    </div>
  );
}
