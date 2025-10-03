import { useState, useEffect } from "react";
import { CircleDashed } from "@phosphor-icons/react";
import { useDatabases } from "@/features/database-management/hooks/useDatabases";
import { useDatabasePitr } from "@/shared/hooks/useApi";
import { queryApi } from "@/features/query-execution/services/queryApi";
import { cn } from "@/shared/lib";
import { GraphView } from "@/features/graph/components/GraphView";
import { QueryEditor } from "@/features/graph/components/QueryEditor";
import { useNavigationStore } from "@/app/stores/navigation";
import { apiClient } from "@/shared/api/client";

export function DashboardPage() {
  const { selectedDatabaseId, setSelectedDatabaseId, selectedPitrPoint, setSelectedPitrPoint, currentAnchorTimestamp, setCurrentAnchorTimestamp } = useNavigationStore();
  const NOW_ANCHOR = 'NOW';
  const [selectedSnapshotId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [graphKey, setGraphKey] = useState(0); // Force graph refresh
  // When a restore is applied, capture the original future windows (ordered) to display as a parallel rail
  const [baselineFuture, setBaselineFuture] = useState<string[]>([]);
  // Track last executed query per (dbId|walEnd) to reload into editor on node click
  const [queryByWalEnd, setQueryByWalEnd] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('queryByWalEnd') || '{}'); } catch { return {}; }
  });
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [externalQuery, setExternalQuery] = useState<string | null>(null);
  const [lastQueryByDb, setLastQueryByDb] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('lastQueryByDb') || '{}'); } catch { return {}; }
  });
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch databases
  const { data: databases = [] } = useDatabases();
  // Auto-select first DB on mount
  useEffect(() => {
    if (databases.length > 0 && !selectedDatabaseId) {
      setSelectedDatabaseId(databases[0].id);
    }
  }, [databases, selectedDatabaseId, setSelectedDatabaseId]);

  // Initialize anchor to NOW so the green node is active at first render
  useEffect(() => {
    if (selectedDatabaseId && !currentAnchorTimestamp) {
      setCurrentAnchorTimestamp(NOW_ANCHOR);
    }
  }, [selectedDatabaseId, currentAnchorTimestamp, setCurrentAnchorTimestamp]);

  const pitrQuery = useDatabasePitr(selectedDatabaseId || '', { window: 'hour' });
  const walWindows: Array<{ start: string; end: string; files?: number }> = pitrQuery.data?.wal_windows ?? [];

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
          setTimeout(() => {
            setGraphKey(prev => prev + 1);
            // refresh PITR windows to reflect new WAL, then attach the pending query to the latest window
            pitrQuery.refetch?.().then((res: any) => {
              const windows = res?.data?.wal_windows || walWindows;
              if (windows && windows.length > 0 && pendingQuery && selectedDatabaseId) {
                const latest = windows[windows.length - 1];
                const key = `${selectedDatabaseId}|${latest.end}`;
                setQueryByWalEnd((prev) => {
                  const next = { ...prev, [key]: pendingQuery };
                  try { localStorage.setItem('queryByWalEnd', JSON.stringify(next)); } catch {}
                  return next;
                });
                setLastQueryByDb((prev) => {
                  const next = { ...prev, [selectedDatabaseId]: pendingQuery };
                  try { localStorage.setItem('lastQueryByDb', JSON.stringify(next)); } catch {}
                  return next;
                });
                setExternalQuery(pendingQuery);
                setPendingQuery(null);
              }
            });
          }, 300);
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

  // const selectedDb = databases.find(db => db.id === selectedDatabaseId);

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
  const isMutatingQuery = (q: string): boolean => {
    const mutating = /(CREATE|MERGE|SET\s+|DELETE|REMOVE|LOAD|COPY|DROP|ALTER|ATTACH|IMPORT)/i;
    return mutating.test(q);
  };

  const applyRestore = async (ts: string) => {
    if (!selectedDatabaseId) return;
    // capture baseline (ordered): all future windows from the selected timestamp
    const baseline = walWindows
      .filter((w) => new Date(w.end).getTime() > new Date(ts).getTime())
      .map((w) => w.end);
    setBaselineFuture(baseline);
    
    // Update UI immediately (before backend call)
    setCurrentAnchorTimestamp(ts);
    setSelectedPitrPoint(null);
    setIsRestoring(true);
    
    try {
      // Normalize timestamp for API/logs
      const targetTs = ts.endsWith('+00:00') ? ts.replace('+00:00', 'Z') : ts;
      console.log('[PITR] applyRestore', { databaseId: selectedDatabaseId, targetTs });

      // Pre-validate restore plan (helps surface clear backend reasons early)
      try {
        const planRes = await apiClient.get(`/api/v1/databases/${selectedDatabaseId}/pitr?target=${encodeURIComponent(targetTs)}`);
        console.log('[PITR] Plan reçu:', planRes.data?.plan || null);
      } catch (planErr: any) {
        console.warn('[PITR] GET /pitr?target a échoué (on tente quand même le POST):', planErr?.response?.data || planErr);
      }

      await apiClient.post(`/api/v1/databases/${selectedDatabaseId}/restore-pitr?target_timestamp=${encodeURIComponent(targetTs)}`);
    } catch (error) {
      const detail = (error as any)?.response?.data || error;
      console.warn('PITR restore failed (backend issue), but UI updated:', detail);
    }
    
    // small delay to let backend settle
    setTimeout(() => {
      setGraphKey((k) => k + 1);
      pitrQuery.refetch?.();
      setIsRestoring(false);
    }, 300);
  };

  const backToNow = async () => {
    const now = new Date().toISOString();
    setBaselineFuture([]);
    setSelectedPitrPoint(null);
    await applyRestore(now);
    setCurrentAnchorTimestamp(NOW_ANCHOR);
  };

  const handleSelectNode = async (endTs: string) => {
    await applyRestore(endTs);
    // Load last query for this node if available
    if (selectedDatabaseId) {
      const key = `${selectedDatabaseId}|${endTs}`;
      const q = queryByWalEnd[key] || lastQueryByDb[selectedDatabaseId] || null;
      setExternalQuery(q);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!selectedDatabaseId) return;

    try {
      setIsExecuting(true);
      setPendingQuery(query);
      // Fork logic: if mutating and preview active, ensure restore to preview point first
      if (isMutatingQuery(query) && selectedPitrPoint && selectedPitrPoint !== currentAnchorTimestamp) {
        await applyRestore(selectedPitrPoint);
      }
      // Submit query and get transaction id
      const result = await queryApi.submitQuery(selectedDatabaseId, { query });
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
      {/* Timeline Sidebar - Git-style PITR visualization */}
      <div className="w-24 bg-gradient-to-br from-gray-50 to-gray-100 border-r border-gray-200 flex flex-col items-center py-6 overflow-y-auto">
        {/* HEAD indicator (label only, node is in the timeline) */}
        <div className="text-xs font-bold text-gray-600 mb-3 tracking-wider">HEAD</div>
        <div className="w-px h-2 bg-gray-300" />

        {/* Timeline nodes (including "Now" as first node) */}
        <div className="flex flex-col items-center space-y-2 mt-2">
          {/* NOW node (HEAD position) */}
          <div className="relative flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200",
                  currentAnchorTimestamp === NOW_ANCHOR
                    ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50 scale-125 ring-4 ring-blue-200" 
                    : "bg-gray-300 border-gray-400 hover:scale-110 hover:bg-gray-400"
                )}
                onClick={backToNow}
                title="Current state (HEAD)"
                data-testid="now-node"
              />
              {walWindows.length > 0 && (
                <div className={cn(
                  "w-0.5 h-8 my-1 rounded-full",
                  currentAnchorTimestamp === NOW_ANCHOR ? "bg-blue-300" : "bg-gray-300"
                )} />
              )}
            </div>
            {/* Label on selection */}
            {currentAnchorTimestamp === NOW_ANCHOR && (
              <div className="absolute left-8 text-[11px] font-medium bg-blue-600 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                Now
              </div>
            )}
          </div>

          {/* PITR nodes */}
          {walWindows.map((w, idx) => {
            const isSelected = currentAnchorTimestamp === w.end;
            // Find selected node index
            const selectedIdx = walWindows.findIndex(x => currentAnchorTimestamp === x.end);
            // If a node is selected, all nodes BEFORE it (more recent) should be gray
            const isFuture = selectedIdx >= 0 && idx < selectedIdx;
            
            return (
              <div key={`node-${w.end}-${idx}`} className="relative flex items-center gap-3">
                {/* Main node */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200",
                      isSelected 
                        ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50 scale-125 ring-4 ring-blue-200" 
                        : isFuture
                        ? "bg-gray-300 border-gray-400 hover:scale-110 hover:bg-gray-400"
                        : "bg-blue-500 border-blue-300 hover:scale-110 hover:shadow-md"
                    )}
                    title={`PITR: ${formatDate(w.end)}${w.files ? ` • ${w.files} WAL files` : ''}`}
                    onClick={() => handleSelectNode(w.end)}
                    data-testid={`curr-node-${idx}`}
                  />
                  
                  {/* Connector to next */}
                  {idx < walWindows.length - 1 && (
                    <div className={cn(
                      "w-0.5 h-8 my-1 rounded-full",
                      isFuture || (selectedIdx >= 0 && idx === selectedIdx - 1) ? "bg-gray-300" : "bg-blue-300"
                    )} />
                  )}
                </div>

                {/* Label on selection */}
                {isSelected && (
                  <div className="absolute left-8 text-[11px] font-medium bg-blue-600 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                    {formatDate(w.end)}
                    {w.files && <span className="ml-1 opacity-80">• {w.files} WAL</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Main Content - Graph Viewer (Fixed height, no scroll) */}
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50 overflow-hidden">
        {/* Query Editor - Fixed height */}
        <div className="flex-shrink-0 px-4 pt-4">
          <QueryEditor databaseId={selectedDatabaseId} onExecute={handleExecuteQuery} isExecuting={isExecuting || isRestoring} externalQuery={externalQuery} />
        </div>

        <div className="flex-1 px-4 pb-0 min-h-0">
          <div className="relative h-full">
            {isRestoring && (
              <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center text-sm text-gray-700">
                Restoring...
              </div>
            )}
            <GraphView key={graphKey} databaseId={selectedDatabaseId} snapshotId={selectedSnapshotId} />
          </div>
        </div>
      </div>
    </div>
  );
}
