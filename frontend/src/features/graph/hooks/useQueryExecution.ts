import { useState, useCallback } from 'react';
import { queryApi } from '@/features/query-execution/services/queryApi';
import { useSSEQueryCompletion } from '@/shared/hooks/useSSEQueryCompletion';
import type { SSEQueryEvent } from '@/shared/types/pitr';

interface UseQueryExecutionOptions {
  onQueryCompleted?: (query: string) => void;
  onGraphRefresh?: () => void;
}

/**
 * Hook to manage query execution with SSE completion tracking
 */
export function useQueryExecution({
  onQueryCompleted,
  onGraphRefresh,
}: UseQueryExecutionOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  const handleCompleted = useCallback((event: SSEQueryEvent) => {
    console.log('[QueryExecution] Query completed via SSE');
    setPendingTxId(null);
    setIsExecuting(false);
    
    if (pendingQuery) {
      onQueryCompleted?.(pendingQuery);
      setPendingQuery(null);
    }
    
    // Refresh graph after a small delay
    setTimeout(() => {
      onGraphRefresh?.();
    }, 300);
  }, [pendingQuery, onQueryCompleted, onGraphRefresh]);

  const handleFailed = useCallback((event: SSEQueryEvent) => {
    console.error('[QueryExecution] Query failed:', event.error);
    setPendingTxId(null);
    setIsExecuting(false);
    setPendingQuery(null);
  }, []);

  const handleTimeout = useCallback((event: SSEQueryEvent) => {
    console.warn('[QueryExecution] SSE timeout - refreshing anyway');
    setPendingTxId(null);
    setIsExecuting(false);
    setPendingQuery(null);
    onGraphRefresh?.();
  }, [onGraphRefresh]);

  // Listen for SSE completion
  useSSEQueryCompletion({
    pendingTxId,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onTimeout: handleTimeout,
  });

  const executeQuery = useCallback(async (databaseId: string, query: string) => {
    if (!databaseId) return;

    try {
      setIsExecuting(true);
      setPendingQuery(query);

      const result = await queryApi.submitQuery(databaseId, { query });
      const txId: string | undefined = result?.transaction_id;

      if (!txId) {
        console.error('[QueryExecution] No transaction_id returned');
        setIsExecuting(false);
        setPendingQuery(null);
        return;
      }

      console.log('[QueryExecution] Query submitted, txId:', txId);
      setPendingTxId(txId);
    } catch (error) {
      console.error('[QueryExecution] Failed to execute query:', error);
      setIsExecuting(false);
      setPendingQuery(null);
    }
  }, []);

  return {
    executeQuery,
    isExecuting,
    pendingTxId,
    pendingQuery,
  };
}
