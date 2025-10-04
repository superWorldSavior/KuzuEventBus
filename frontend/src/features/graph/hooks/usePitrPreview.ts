import { useState, useCallback } from 'react';
import { apiClient } from '@/shared/api/client';
import type { QueryPreviewResult } from '@/shared/types/pitr';

interface UsePitrPreviewOptions {
  databaseId: string | null;
  onPreviewLoaded?: (results: QueryPreviewResult[]) => void;
}

/**
 * Hook to manage PITR preview operations
 */
export function usePitrPreview({ databaseId, onPreviewLoaded }: UsePitrPreviewOptions) {
  const [previewResults, setPreviewResults] = useState<QueryPreviewResult[] | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadPreview = useCallback(async (
    targetTimestamp: string,
    previewQuery: string = 'MATCH (n) RETURN n LIMIT 100'
  ) => {
    if (!databaseId) return;

    setIsRestoring(true);
    try {
      console.log('[PITR] Loading preview at:', targetTimestamp);

      const response = await apiClient.get(
        `/api/v1/databases/${databaseId}/pitr/preview?target_timestamp=${encodeURIComponent(targetTimestamp)}&preview_query=${encodeURIComponent(previewQuery)}`
      );

      const results = response.data?.results || [];
      setPreviewResults(results);
      onPreviewLoaded?.(results);
      
      console.log('[PITR] Preview loaded:', results.length, 'results');
    } catch (error) {
      console.error('[PITR] Preview failed:', error);
      setPreviewResults(null);
    } finally {
      setIsRestoring(false);
    }
  }, [databaseId, onPreviewLoaded]);

  const clearPreview = useCallback(() => {
    setPreviewResults(null);
  }, []);

  return {
    previewResults,
    isRestoring,
    loadPreview,
    clearPreview,
  };
}
