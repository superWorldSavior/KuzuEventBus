import { useEffect } from 'react';
import type { SSEQueryEvent } from '@/shared/types/pitr';
import { PITR_TIMEOUTS } from '@/shared/constants/pitr';
import { useSSEEvents } from './useSSEEvents';

export interface UseSSEQueryCompletionOptions {
  pendingTxId: string | null;
  onCompleted?: (event: SSEQueryEvent) => void;
  onFailed?: (event: SSEQueryEvent) => void;
  onTimeout?: (event: SSEQueryEvent) => void;
  fallbackTimeoutMs?: number;
}

/**
 * Hook to listen for SSE query completion events.
 * Automatically sets up fallback timeout and cleanup.
 * 
 * This hook uses the generic useSSEEvents hook but adds query-specific
 * logic like transaction ID filtering and fallback timeout.
 */
export function useSSEQueryCompletion({
  pendingTxId,
  onCompleted,
  onFailed,
  onTimeout,
  fallbackTimeoutMs = PITR_TIMEOUTS.SSE_FALLBACK_MS,
}: UseSSEQueryCompletionOptions) {
  // Listen for query-related SSE events
  useSSEEvents({
    eventTypes: ['completed', 'failed', 'timeout'],
    onEvent: (event) => {
      const data = event as any as SSEQueryEvent;
      
      // Check if it's for our pending query
      if (data.transaction_id !== pendingTxId) return;

      console.log('✅ [SSE] Event matches our query:', data);

      // Cancel the fallback timeout
      const timeoutId = (window as any)[`timeout_${data.transaction_id}`];
      if (timeoutId) {
        clearTimeout(timeoutId);
        delete (window as any)[`timeout_${data.transaction_id}`];
      }

      // Route to appropriate handler
      switch (data.event_type) {
        case 'completed':
          console.log('[SSE] Query completed');
          onCompleted?.(data);
          break;
        case 'failed':
          console.error('[SSE] Query failed:', data.error);
          onFailed?.(data);
          break;
        case 'timeout':
          console.error('[SSE] Query timeout:', data.error);
          onTimeout?.(data);
          break;
      }
    },
  });

  // Set up fallback timeout (separate effect for timeout management)
  useEffect(() => {
    if (!pendingTxId) return;

    console.log('👂 [SSE] Listening for query completion:', pendingTxId);

    const timeoutId = setTimeout(() => {
      console.warn(`⏱️ [SSE] Timeout (${fallbackTimeoutMs}ms) - no event received`);
      onTimeout?.({
        event_type: 'timeout',
        transaction_id: pendingTxId,
        error: 'SSE event timeout',
      });
    }, fallbackTimeoutMs);

    // Store timeout ID for cancellation
    (window as any)[`timeout_${pendingTxId}`] = timeoutId;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        delete (window as any)[`timeout_${pendingTxId}`];
      }
    };
  }, [pendingTxId, onTimeout, fallbackTimeoutMs]);
}
