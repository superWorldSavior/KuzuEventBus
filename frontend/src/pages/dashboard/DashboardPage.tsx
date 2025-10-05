import { useState, useEffect } from "react";
import { useDatabases, useDatabasePitr } from "@/features/database-management";
import { GraphView } from "@/features/graph/components/GraphView";
import { PreviewTable } from "@/features/graph/components/PreviewTable";
import { QueryEditor } from "@/features/graph/components/QueryEditor";
import { useNavigationStore } from "@/app/stores/navigation";
import { StorageService, STORAGE_KEYS } from "@/shared/services/storage";
import { PITR_ANCHOR } from "@/shared/constants/pitr";
import { isMutatingQuery, derivePreviewQuery } from "@/shared/utils/cypherUtils";
import { usePitrTimeline } from "@/features/graph/hooks/usePitrTimeline";
import { databaseApi } from "@/features/database-management/services/databaseApi";
import { usePitrPreview } from "@/features/graph/hooks/usePitrPreview";
import { useQueryExecution } from "@/features/graph/hooks/useQueryExecution";
import { PitrTimeline } from "@/features/graph/components/PitrTimeline";
import { GraphViewerControls } from "@/features/graph/components/GraphViewerControls";
import { useBranching } from "@/features/graph/hooks/useBranching";
import { usePitrRestoreEvents } from "@/features/database-management/hooks/usePitrRestoreEvents";

export function DashboardPage() {
  const { selectedDatabaseId, setSelectedDatabaseId, selectedPitrPoint, setSelectedPitrPoint, currentAnchorTimestamp, setCurrentAnchorTimestamp } = useNavigationStore();
  const LAST_ANCHOR = PITR_ANCHOR.LAST;
  const [selectedSnapshotId] = useState<string | null>(null);
  type ExecContext = 'prod' | 'preview' | 'branch';
  const [executionContextByDb, setExecutionContextByDb] = useState<Record<string, ExecContext>>({});
  const executionContext = selectedDatabaseId ? (executionContextByDb[selectedDatabaseId] ?? 'prod') : 'prod';
  const setExecutionContext = (ctx: ExecContext) => {
    if (selectedDatabaseId) {
      setExecutionContextByDb((prev) => ({ ...prev, [selectedDatabaseId]: ctx }));
    }
  };

  // Destructive restore on PROD (PITR): confirm in timeline tooltip, then restore
  const handleRestoreAt = async (ts: string) => {
    if (!selectedDb?.name) return;
    try {
      await databaseApi.restorePitr(selectedDb.name, ts);
      // Reset UI to PROD @ HEAD
      await pitrQuery.refetch?.();
      setSelectedPitrPoint(null);
      setCurrentAnchorTimestamp(LAST_ANCHOR);
      setExecutionContext('prod');
      clearPreview();
      setExternalQuery(null);
      if (selectedDatabaseId) {
        setProdArmedByDb((prev) => ({ ...prev, [selectedDatabaseId]: false }));
      }
    } catch (error) {
      console.error('[Restore] Failed to restore at', ts, error);
    }
  };
  const [prodArmedByDb, setProdArmedByDb] = useState<Record<string, boolean>>({}); // Red state for Run on Prod per database
  const isProdArmed = selectedDatabaseId ? (prodArmedByDb[selectedDatabaseId] ?? false) : false;
  const { data: databases = [] } = useDatabases();
  const selectedDb = databases.find(db => db.id === selectedDatabaseId) || null;
  const { branches, activeBranch, activeBranchName, createBranch, switchBranch, addWinToBranch } = useBranching(selectedDatabaseId, selectedDb?.name ?? null);
  
  // Listen for database restore events via SSE (feature-owned hook)
  usePitrRestoreEvents({
    selectedDatabaseId,
    onRestored: ({ database_id, target_timestamp }) => {
      if (database_id !== selectedDatabaseId) return;
      // Reset UI to PROD @ HEAD after restore
      setSelectedPitrPoint(null);
      setCurrentAnchorTimestamp(LAST_ANCHOR);
      setExecutionContext('prod');
      if (selectedDatabaseId) {
        setProdArmedByDb((prev) => ({ ...prev, [selectedDatabaseId]: false }));
      }
      // Refetch PITR data to update timeline
      pitrQuery.refetch?.();
    },
    debug: true,
  });
  // Query execution hook
  const { executeQuery, isExecuting } = useQueryExecution({
    onQueryCompleted: async (query) => {
      // After completion, refresh PITR and save the query for the latest window
      const res: any = await pitrQuery.refetch?.();
      const windows = res?.data?.wal_windows || walWindows;
      if (windows && windows.length > 0 && selectedDatabaseId) {
        const latest = windows[windows.length - 1];
        const key = `${selectedDatabaseId}|${latest.end}`;
        setQueryByWalEnd((prev: Record<string, string>) => {
          const next = { ...prev, [key]: query };
          StorageService.set(STORAGE_KEYS.QUERY_BY_WAL_END, next);
          return next;
        });
        setExternalQuery(query);
      }
      // Small graph refresh
      setGraphKey((prev) => prev + 1);
    },
    onGraphRefresh: () => setGraphKey((prev) => prev + 1),
  });
  const [graphViewMode, setGraphViewMode] = useState<"graph" | "table">("graph");
  const [aggregationMode, setAggregationMode] = useState<boolean>(false);
  const [graphKey, setGraphKey] = useState(0); // Force graph refresh
  // Track last executed query per (dbId|walEnd) to reload into editor on node click
  const [queryByWalEnd, setQueryByWalEnd] = useState<Record<string, string>>(() =>
    StorageService.get<Record<string, string>>(STORAGE_KEYS.QUERY_BY_WAL_END, {})
  );
  const [externalQuery, setExternalQuery] = useState<string | null>(null);
  // Preview results to feed the graph viewer when using PITR preview
  const { previewResults, isRestoring, loadPreview, clearPreview } = usePitrPreview({
    databaseId: selectedDatabaseId,
    onPreviewLoaded: () => setGraphKey((k) => k + 1),
  });
  // Use centralized PITR timeline hook
  const { mutatingWins } = usePitrTimeline(selectedDatabaseId);

  // Fetch databases (moved up to compute selectedDb)
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

  // Load persisted execution context
  useEffect(() => {
    const savedExec = StorageService.get<ExecContext>(STORAGE_KEYS.EXECUTION_CONTEXT, 'prod');
    setExecutionContext(savedExec);
  }, []);

  // Persist execution context
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.EXECUTION_CONTEXT, executionContext);
  }, [executionContext]);

  // Derive execution context from selection
  useEffect(() => {
    if (!currentAnchorTimestamp) return;
    if (currentAnchorTimestamp === LAST_ANCHOR) {
      setExecutionContext('prod');
    } else {
      setExecutionContext('preview');
    }
  }, [currentAnchorTimestamp]);

  // Reset editor and preview when switching database to avoid cross-DB leakage
  useEffect(() => {
    if (!selectedDatabaseId) return;
    setExternalQuery(null);
    clearPreview();
    // keep anchor as-is; loadHeadQuery effect will run if NOW
  }, [selectedDatabaseId]);

  // Initialize persisted viewer preferences
  useEffect(() => {
    const savedView = StorageService.get<"graph" | "table">(STORAGE_KEYS.GRAPH_VIEW_MODE, "graph");
    setGraphViewMode(savedView);
    const savedAgg = StorageService.get<boolean>(STORAGE_KEYS.AGGREGATION_MODE, false);
    setAggregationMode(savedAgg);
  }, []);

  // Persist viewer preferences
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.GRAPH_VIEW_MODE, graphViewMode);
  }, [graphViewMode]);
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.AGGREGATION_MODE, aggregationMode);
    // When aggregation mode changes, refresh preview for current selection
    const endTs = currentAnchorTimestamp;
    if (!selectedDatabaseId || !endTs) return;
    if (endTs === LAST_ANCHOR) {
      void backToLast();
    } else {
      void handleSelectNode(endTs);
    }
  }, [aggregationMode]);

  // When mutating windows update and we're at LAST, preload latest mutation into editor
  useEffect(() => {
    if (isProdArmed) return; // do not auto-fill when armed
    if (mutatingWins.length > 0 && currentAnchorTimestamp === LAST_ANCHOR) {
      setExternalQuery(mutatingWins[mutatingWins.length - 1].query);
    }
  }, [mutatingWins, currentAnchorTimestamp, isProdArmed]);

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
      // Fallback: no minute windows with queries -> clear editor
      setExternalQuery(null);
    };
    loadHeadQuery();
  }, [selectedDatabaseId, currentAnchorTimestamp, mutatingWins]);

  const pitrQuery = useDatabasePitr(selectedDatabaseId || '', { window: 'hour' });
  const walWindows: Array<{ start: string; end: string; files?: number }> = pitrQuery.data?.wal_windows ?? [];


  // const selectedDb = databases.find(db => db.id === selectedDatabaseId);

  // Utilities moved to @/shared/utils/

  const applyRestore = async (ts: string) => {
    if (!selectedDatabaseId) return;
    // Update UI immediately (before backend call)
    setCurrentAnchorTimestamp(ts);
    setSelectedPitrPoint(null);
    setExecutionContext('preview');
    
    try {
      // Use PITR preview (non-destructive)
      const previewQueryStr = 'MATCH (n) RETURN n LIMIT 100';
      await loadPreview(ts, previewQueryStr);
      // Pas de fallback: si aucune requête WAL pour le nœud, l'éditeur reste vide
    } catch (error) {
      const detail = (error as any)?.response?.data || error;
      console.warn('PITR preview failed:', detail);
    }
    // small delay to let backend settle
    setTimeout(() => {
      pitrQuery.refetch?.();
    }, 300);
  };

  const backToLast = async () => {
    setSelectedPitrPoint(null);
    setCurrentAnchorTimestamp(LAST_ANCHOR);
    setExecutionContext('prod');
    // Charger la dernière mutation (si disponible)
    const last = mutatingWins[mutatingWins.length - 1];
    if (last) {
      setExternalQuery(last.query);
      // Optionally refresh preview at current timestamp
      try {
        const derived = isMutatingQuery(last.query) ? derivePreviewQuery(last.query) : null;
        // Aggregation mode = cumulative state; ignore derived and use base
        const previewQueryStr = aggregationMode
          ? 'MATCH (n) RETURN n LIMIT 100'
          : (derived || 'MATCH (n) RETURN n LIMIT 100');
        await loadPreview(last.end, previewQueryStr);
      } catch {}
    }
  };

  const handleSelectNode = async (endTs: string) => {
    if (!selectedDatabaseId) return;
    
    // Update UI state
    setCurrentAnchorTimestamp(endTs);
    setSelectedPitrPoint(null);
    setExecutionContext('preview');
    
    try {
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
      await loadPreview(endTs, previewQueryStr);
      console.log('[PITR] Node selected:', { endTs, query: walWindow?.query });
    } catch (error) {
      console.error('[PITR] Failed to preview node:', error);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!selectedDatabaseId) return;

    try {
      if (executionContext === 'preview') {
        // No execution in preview context
        return;
      }
      if (executionContext === 'branch') {
        // Simulate branch run locally: append a node to branch rail
        const ts = new Date().toISOString();
        if (activeBranchName) {
          addWinToBranch(activeBranchName, { start: ts, end: ts });
        }
        setExternalQuery(query);
        setGraphKey((k) => k + 1);
        return;
      }
      // PROD execution: optional restore if user armed a specific point previously
      if (isMutatingQuery(query) && selectedPitrPoint && selectedPitrPoint !== currentAnchorTimestamp) {
        await applyRestore(selectedPitrPoint);
      }
      await executeQuery(selectedDatabaseId, query);
      // Disarm after execution
      if (selectedDatabaseId) {
        setProdArmedByDb((prev) => ({ ...prev, [selectedDatabaseId]: false }));
      }
    } catch (error) {
      console.error("Failed to execute query:", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Timeline Sidebar - Git-style PITR visualization */}
      <PitrTimeline
        mutatingWins={mutatingWins}
        currentAnchorTimestamp={currentAnchorTimestamp}
        lastAnchorValue={LAST_ANCHOR}
        onBackToLast={backToLast}
        onSelectNode={handleSelectNode}
        context={executionContext}
        databaseName={selectedDb?.name ?? null}
        branch={activeBranch ? { name: activeBranch.name, color: activeBranch.color, wins: activeBranch.wins } : null}
        isProdArmed={isProdArmed}
        onRunOnProd={() => {
          setExecutionContext('prod');
          if (selectedDatabaseId) {
            setProdArmedByDb((prev) => ({ ...prev, [selectedDatabaseId]: true })); // Arm the prod node (turns red)
          }
          // Clear editor when arming
          setExternalQuery('');
        }}
        onCreateBranch={(fromTs) => {
          createBranch(fromTs).then((newBranch) => {
            console.log('Branch created:', newBranch);
            setExecutionContext('branch'); // Auto-switch to branch context
            if (selectedDatabaseId) {
              setProdArmedByDb((prev) => ({ ...prev, [selectedDatabaseId]: false })); // Disarm if creating branch
            }
          });
        }}
        onRestoreAt={handleRestoreAt}
      />

      {/* Main Content - Graph Viewer (Fixed height, no scroll) */}
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50 overflow-hidden">
        {/* Toolbar between header and editor */}
        <div className="flex-shrink-0 px-4 py-2 flex items-center gap-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Mode:</span>
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded-full border transition ${
                aggregationMode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setAggregationMode(!aggregationMode)}
              title="Afficher l'état cumulatif au timestamp (agrégé)"
              data-testid="aggregate-toggle"
            >
              Agrégé
            </button>
          </div>
        </div>

        {/* Query Editor - Fixed height */}
        <div className="flex-shrink-0 px-4 pt-4" data-testid="query-editor">
          <QueryEditor
            databaseId={selectedDatabaseId}
            onExecute={handleExecuteQuery}
            isExecuting={isExecuting || isRestoring}
            externalQuery={externalQuery}
            canRun={executionContext === 'prod' || executionContext === 'branch'}
            readOnly={executionContext === 'preview'}
            accent={executionContext === 'branch' ? 'branch' : (isProdArmed ? 'prod-armed' : 'prod')}
            onBlur={() => {
              if (selectedDatabaseId) {
                setProdArmedByDb((prev) => ({ ...prev, [selectedDatabaseId]: false }));
              }
            }}
          />
        </div>

        <div className="flex-1 px-4 pb-0 min-h-0">
          <div className="relative h-full">
            {isRestoring && (
              <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center text-sm text-gray-700">
                Restoring...
              </div>
            )}

            {/* Viewer overlay controls: Graph/Table toggle */}
            <GraphViewerControls mode={graphViewMode} setMode={setGraphViewMode} />

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
