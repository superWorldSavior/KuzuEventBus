import { useState, useEffect } from 'react';
import { StorageService, STORAGE_KEYS } from '@/shared/services/storage';
import type { GraphViewMode } from '@/shared/types/pitr';

/**
 * Hook to manage graph viewer preferences with localStorage persistence
 */
export function useGraphViewerPreferences() {
  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>(() =>
    StorageService.get<GraphViewMode>(STORAGE_KEYS.GRAPH_VIEW_MODE, 'graph')
  );

  const [aggregationMode, setAggregationMode] = useState<boolean>(() =>
    StorageService.get<boolean>(STORAGE_KEYS.AGGREGATION_MODE, false)
  );

  // Persist graph view mode
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.GRAPH_VIEW_MODE, graphViewMode);
  }, [graphViewMode]);

  // Persist aggregation mode
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.AGGREGATION_MODE, aggregationMode);
  }, [aggregationMode]);

  return {
    graphViewMode,
    setGraphViewMode,
    aggregationMode,
    setAggregationMode,
  };
}
