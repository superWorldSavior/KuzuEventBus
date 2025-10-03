import { useState, useEffect } from "react";
import { CircleDashed } from "@phosphor-icons/react";
import { useDatabases } from "@/features/database-management/hooks/useDatabases";
import { useDatabasePitr } from "@/shared/hooks/useApi";
import { queryApi } from "@/features/query-execution/services/queryApi";
import { cn } from "@/shared/lib";
import { GraphView } from "@/features/graph/components/GraphView";
import { PreviewTable } from "@/features/graph/components/PreviewTable";
import { QueryEditor } from "@/features/graph/components/QueryEditor";
import { useNavigationStore } from "@/app/stores/navigation";
import { apiClient } from "@/shared/api/client";

export function DashboardPage() {
  const { selectedDatabaseId, setSelectedDatabaseId, selectedPitrPoint, setSelectedPitrPoint, currentAnchorTimestamp, setCurrentAnchorTimestamp } = useNavigationStore();
  const LAST_ANCHOR = 'LAST';
  const [selectedSnapshotId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [graphViewMode, setGraphViewMode] = useState<"graph" | "table">("graph");
  const [aggregationMode, setAggregationMode] = useState<boolean>(false);
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
  const [isRestoring, setIsRestoring] = useState(false);
  // Preview results to feed the graph viewer when using PITR preview
  const [previewResults, setPreviewResults] = useState<any[] | null>(null);
  // Minute-level mutating windows with queries (source of truth for timeline)
  const [mutatingWins, setMutatingWins] = useState<Array<{ start: string; end: string; query: string; files?: number }>>([]);

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
      setCurrentAnchorTimestamp(LAST_ANCHOR);
    }
  }, [selectedDatabaseId, currentAnchorTimestamp, setCurrentAnchorTimestamp]);

  // Reset editor and preview when switching database to avoid cross-DB leakage
  useEffect(() => {
    if (!selectedDatabaseId) return;
    setExternalQuery(null);
    setPreviewResults(null);
    // keep anchor as-is; loadHeadQuery effect will run if NOW
  }, [selectedDatabaseId]);

  // Initialize persisted viewer preferences
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('graphViewMode');
      if (savedView === 'graph' || savedView === 'table') setGraphViewMode(savedView);
    } catch {}
    try {
      const savedAgg = localStorage.getItem('aggregationMode');
      if (savedAgg === 'true' || savedAgg === 'false') setAggregationMode(savedAgg === 'true');
    } catch {}
  }, []);

  // Persist viewer preferences
  useEffect(() => {
    try { localStorage.setItem('graphViewMode', graphViewMode); } catch {}
  }, [graphViewMode]);
  useEffect(() => {
    try { localStorage.setItem('aggregationMode', String(aggregationMode)); } catch {}
    // When aggregation mode changes, refresh preview for current selection
    const endTs = currentAnchorTimestamp;
    if (!selectedDatabaseId || !endTs) return;
    if (endTs === LAST_ANCHOR) {
      void backToLast();
    } else {
      void handleSelectNode(endTs);
    }
  }, [aggregationMode]);

  // Fetch minute-level windows and derive mutating list when DB changes
  useEffect(() => {
    const loadMinuteWindows = async () => {
      if (!selectedDatabaseId) return;
      try {
        const res = await apiClient.get(
          `/api/v1/databases/${selectedDatabaseId}/pitr?window=minute&include_queries=true`
        );
        const wins: Array<any> = res.data?.wal_windows || [];
        const muts = wins.filter((w: any) => {
          const q = w?.query;
          return q && typeof q === 'string' && q.trim() && isMutatingQuery(q);
        }).map((w: any) => ({ start: w.start, end: w.end, query: w.query as string, files: w.files }));
        setMutatingWins(muts);
        // If head is LAST, preload the last mutation query in editor
        if (muts.length > 0 && currentAnchorTimestamp === LAST_ANCHOR) {
          setExternalQuery(muts[muts.length - 1].query);
        }
      } catch (e) {
        setMutatingWins([]);
      }
    };
    loadMinuteWindows();
  }, [selectedDatabaseId]);

  // When DB changes or we are on LAST, try to load the latest WAL query at HEAD (mutation-based)
  useEffect(() => {
    const loadHeadQuery = async () => {
      if (!selectedDatabaseId) return;
      if (currentAnchorTimestamp !== LAST_ANCHOR) return;
      // If we already have mutating windows, prefer them
      if (mutatingWins.length > 0) {
        setExternalQuery(mutatingWins[mutatingWins.length - 1].query);
        return;
      }
      // Fallback: fetch minute windows and pick last with query
      try {
        const res = await apiClient.get(
          `/api/v1/databases/${selectedDatabaseId}/pitr?window=minute&include_queries=true`
        );
        const wins: Array<any> = res.data?.wal_windows || [];
        for (let i = wins.length - 1; i >= 0; i--) {
          const q = wins[i]?.query;
          if (q && typeof q === 'string' && q.trim()) {
            setExternalQuery(q);
            return;
          }
        }
        setExternalQuery(null);
      } catch (e) { setExternalQuery(null); }
    };
    loadHeadQuery();
  }, [selectedDatabaseId, currentAnchorTimestamp, mutatingWins]);

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

  // Derive a read-only preview query from a mutating query to visualize created/merged entities
  const derivePreviewQuery = (q: string): string | null => {
    try {
      const text = q.trim().replace(/\s+/g, ' ');
      // Pattern 1: CREATE/MERGE (n:Label { ... })
      const nodePattern = /(CREATE|MERGE)\s*\((\w+):([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}\)/i;
      const nodeMatch = text.match(nodePattern);
      if (nodeMatch) {
        const varName = nodeMatch[2];
        const label = nodeMatch[3];
        const props = nodeMatch[4]?.trim();
        const propFilter = props ? `{ ${props} }` : '';
        return `MATCH (${varName}:${label} ${propFilter}) RETURN ${varName} LIMIT 100`;
      }

      // Pattern 2: CREATE/MERGE (a:LA? {..})-[r:TYPE]->(b:LB? {..})
      const relPattern = /(CREATE|MERGE)\s*\(\s*(\w+)(?::([A-Za-z_][A-Za-z0-9_]*))?\s*(\{[^}]*\})?\s*\)\s*-\s*\[\s*(\w+)?(?::([A-Za-z_][A-Za-z0-9_]*))?\s*\]\s*->\s*\(\s*(\w+)(?::([A-Za-z_][A-Za-z0-9_]*))?\s*(\{[^}]*\})?\s*\)/i;
      const relMatch = text.match(relPattern);
      if (relMatch) {
        const aVar = relMatch[2];
        const aLabel = relMatch[3] ? `:${relMatch[3]}` : '';
        const aProps = relMatch[4] ? ` ${relMatch[4]} ` : '';
        const rVar = relMatch[5] || 'r';
        const rType = relMatch[6] ? `:${relMatch[6]}` : '';
        const bVar = relMatch[7];
        const bLabel = relMatch[8] ? `:${relMatch[8]}` : '';
        const bProps = relMatch[9] ? ` ${relMatch[9]} ` : '';
        return `MATCH (${aVar}${aLabel}${aProps})-[${rVar}${rType}]->(${bVar}${bLabel}${bProps}) RETURN ${aVar}, ${rVar}, ${bVar} LIMIT 100`;
      }

      return null;
    } catch {
      return null;
    }
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
      console.log('[PITR] Preview at timestamp', { databaseId: selectedDatabaseId, targetTs });

      // Use PITR preview (non-destructive) instead of restore
      const previewQueryStr = 'MATCH (n) RETURN n LIMIT 100';
      const previewRes = await apiClient.get(
        `/api/v1/databases/${selectedDatabaseId}/pitr/preview?target_timestamp=${encodeURIComponent(targetTs)}&preview_query=${encodeURIComponent(previewQueryStr)}`
      );
      
      console.log('[PITR] Preview results:', previewRes.data);
      
      // Update graph with preview results
      if (previewRes.data?.results) {
        setPreviewResults(previewRes.data.results);
        // Store preview results for graph rendering
        // The graph will use these results instead of querying the DB
        setGraphKey((k) => k + 1);
      }
      // Pas de fallback: si aucune requête WAL pour le nœud, l'éditeur reste vide
    } catch (error) {
      const detail = (error as any)?.response?.data || error;
      console.warn('PITR preview failed:', detail);
    }
    
    // small delay to let backend settle
    setTimeout(() => {
      pitrQuery.refetch?.();
      setIsRestoring(false);
    }, 300);
  };

  const backToLast = async () => {
    setBaselineFuture([]);
    setSelectedPitrPoint(null);
    setCurrentAnchorTimestamp(LAST_ANCHOR);
    // Charger la dernière mutation (si disponible)
    const last = mutatingWins[mutatingWins.length - 1];
    if (last) {
      setExternalQuery(last.query);
      // Optionally refresh preview at current timestamp
      try {
        const targetTs = last.end.endsWith('+00:00') ? last.end.replace('+00:00', 'Z') : last.end;
        const derived = isMutatingQuery(last.query) ? derivePreviewQuery(last.query) : null;
        // Aggregation mode = cumulative state; ignore derived and use base
        const previewQueryStr = aggregationMode
          ? 'MATCH (n) RETURN n LIMIT 100'
          : (derived || 'MATCH (n) RETURN n LIMIT 100');
        const previewRes = await apiClient.get(
          `/api/v1/databases/${selectedDatabaseId}/pitr/preview?target_timestamp=${encodeURIComponent(targetTs)}&preview_query=${encodeURIComponent(previewQueryStr)}`
        );
        setPreviewResults(previewRes.data?.results || null);
        setGraphKey((k) => k + 1);
      } catch {}
    }
  };

  const handleSelectNode = async (endTs: string) => {
    if (!selectedDatabaseId) return;
    
    // Update UI state
    setCurrentAnchorTimestamp(endTs);
    setSelectedPitrPoint(null);
    setIsRestoring(true);
    
    try {
      const targetTs = endTs.endsWith('+00:00') ? endTs.replace('+00:00', 'Z') : endTs;
      // Find the exact mutating window by end timestamp
      const walWindow = mutatingWins.find(w => w.end === endTs) || null;
      
      if (walWindow?.query) {
        // Charger uniquement la requête réellement associée au nœud
        setExternalQuery(walWindow.query);
      } else {
        // Pas de fallback
        setExternalQuery(null);
      }
      
      // Preview the database state at this point
      const basePreview = 'MATCH (n) RETURN n LIMIT 100';
      const derived = walWindow?.query && isMutatingQuery(walWindow.query)
        ? derivePreviewQuery(walWindow.query)
        : null;
      // Aggregation mode shows cumulative state at timestamp; otherwise show mutation-focused preview
      const previewQueryStr = aggregationMode ? basePreview : (derived || basePreview);
      const previewRes = await apiClient.get(
        `/api/v1/databases/${selectedDatabaseId}/pitr/preview?target_timestamp=${encodeURIComponent(targetTs)}&preview_query=${encodeURIComponent(previewQueryStr)}`
      );
      
      console.log('[PITR] Node selected:', { endTs, query: walWindow?.query, preview: previewRes.data });
      
      // Refresh graph with preview results
      setPreviewResults(previewRes.data?.results || null);
      setGraphKey((k) => k + 1);
    } catch (error) {
      console.error('[PITR] Failed to preview node:', error);
    } finally {
      setIsRestoring(false);
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

        {/* Branch controls: aggregation only (Graph/Table stays in viewer overlay) */}
        <div className="mt-3 mb-2 flex flex-col items-center space-y-2">
          <button
            type="button"
            className={`px-2 py-1 text-[10px] rounded border ${aggregationMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
            onClick={() => setAggregationMode(!aggregationMode)}
            title="Afficher l'état cumulatif au timestamp (agrégé)"
            data-testid="aggregate-toggle"
          >
            Agrégé
          </button>
        </div>

        {/* Timeline nodes (including "Now" as first node) */}
        <div className="flex flex-col items-center space-y-2 mt-2">
          {/* LAST node (head = last mutating query) */}
          <div className="relative flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200",
                  currentAnchorTimestamp === LAST_ANCHOR
                    ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50 scale-125 ring-4 ring-blue-200" 
                    : "bg-gray-300 border-gray-400 hover:scale-110 hover:bg-gray-400"
                )}
                onClick={backToLast}
                title="Last mutating query (HEAD)"
                data-testid="now-node"
              />
              {(mutatingWins.length > 0 || walWindows.length > 0) && (
                <div className={cn(
                  "w-0.5 h-8 my-1 rounded-full",
                  currentAnchorTimestamp === LAST_ANCHOR ? "bg-blue-300" : "bg-gray-300"
                )} />
              )}
            </div>
            {/* Label on selection */}
            {currentAnchorTimestamp === LAST_ANCHOR && (
              <div className="absolute left-8 text-[11px] font-medium bg-blue-600 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                Last
              </div>
            )}
          </div>

          {/* Mutation nodes (each node = one mutating query) */}
          {mutatingWins.map((w, idx) => {
            const isSelected = currentAnchorTimestamp === w.end;
            // Find selected node index
            const selectedIdx = mutatingWins.findIndex(x => currentAnchorTimestamp === x.end);
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
                    title={`Mutation: ${formatDate(w.end)}`}
                    onClick={() => handleSelectNode(w.end)}
                    data-testid={`curr-node-${idx}`}
                  />
                  
                  {/* Connector to next */}
                  {idx < mutatingWins.length - 1 && (
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
        <div className="flex-shrink-0 px-4 pt-4" data-testid="query-editor">
          <QueryEditor databaseId={selectedDatabaseId} onExecute={handleExecuteQuery} isExecuting={isExecuting || isRestoring} externalQuery={externalQuery} />
        </div>

        <div className="flex-1 px-4 pb-0 min-h-0">
          <div className="relative h-full">
            {isRestoring && (
              <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center text-sm text-gray-700">
                Restoring...
              </div>
            )}

            {/* Viewer overlay controls: Graph/Table toggle */}
            <div className="absolute right-3 top-3 z-20 flex items-center space-x-1">
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded border ${graphViewMode === 'graph' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setGraphViewMode('graph')}
              >
                Graph
              </button>
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded border ${graphViewMode === 'table' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setGraphViewMode('table')}
                data-testid="graph-table-toggle"
              >
                Table
              </button>
            </div>

            {graphViewMode === 'table' ? (
              <PreviewTable results={previewResults || []} />
            ) : (
              <GraphView key={graphKey} databaseId={selectedDatabaseId} snapshotId={selectedSnapshotId} previewResults={previewResults || undefined} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
