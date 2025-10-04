import { useEffect } from 'react';

/**
 * SSE Event types emitted by the backend
 */
export type SSEEventType =
  // Databases
  | 'database_created'
  | 'database_deleted'
  | 'file_uploaded'
  // Snapshots & PITR
  | 'snapshot_created'
  | 'database_restored'
  // Branches
  | 'branch_created'
  | 'branch_merged'
  | 'branch_deleted'
  // Queries
  | 'completed'
  | 'timeout'
  | 'failed'
  | 'query_cancelled'
  // Accounts
  | 'welcome'
  | 'api_key_created'
  | 'subscription_updated';

export interface SSEEvent {
  event_type: SSEEventType;
  title: string;
  message: string;
  timestamp: string;
  // Metadata varies by event type
  [key: string]: any;
}

export interface UseSSEEventsOptions {
  /**
   * Event types to listen for. If not provided, listens to all events.
   */
  eventTypes?: SSEEventType[];
  
  /**
   * Callback when any SSE event is received
   */
  onEvent?: (event: SSEEvent) => void;
  
  /**
   * Specific handlers by event type
   */
  handlers?: Partial<Record<SSEEventType, (event: SSEEvent) => void>>;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Hook to listen for SSE events from the backend.
 * 
 * This hook listens to the global 'sse:event' custom events dispatched
 * by the SSE connection manager.
 * 
 * @example
 * ```tsx
 * useSSEEvents({
 *   eventTypes: ['branch_created', 'branch_merged'],
 *   handlers: {
 *     branch_created: (event) => {
 *       toast.success(`Branch ${event.branch_name} created!`);
 *       refetchBranches();
 *     },
 *     branch_merged: (event) => {
 *       toast.success(`Branch merged into ${event.target_database}`);
 *     },
 *   },
 * });
 * ```
 */
export function useSSEEvents({
  eventTypes,
  onEvent,
  handlers,
  debug = false,
}: UseSSEEventsOptions = {}) {
  useEffect(() => {
    const handleSSEEvent = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const data = customEvent.detail;

      if (debug) {
        console.log('📨 [SSE Event]', data.event_type, data);
      }

      // Filter by event types if specified
      if (eventTypes && !eventTypes.includes(data.event_type)) {
        return;
      }

      // Call generic handler
      onEvent?.(data);

      // Call specific handler if registered
      const handler = handlers?.[data.event_type];
      if (handler) {
        handler(data);
      }
    };

    // Listen for SSE events dispatched by the SSE connection manager
    window.addEventListener('sse:event', handleSSEEvent);

    if (debug) {
      console.log('👂 [SSE] Listening for events:', eventTypes || 'all');
    }

    return () => {
      window.removeEventListener('sse:event', handleSSEEvent);
      if (debug) {
        console.log('🔇 [SSE] Stopped listening');
      }
    };
  }, [eventTypes, onEvent, handlers, debug]);
}

/**
 * Hook to listen for a specific SSE event type with optional filtering.
 * 
 * @example
 * ```tsx
 * useSSEEvent('branch_created', (event) => {
 *   if (event.branch_name === expectedBranchName) {
 *     toast.success('Your branch is ready!');
 *     setIsCreating(false);
 *   }
 * });
 * ```
 */
export function useSSEEvent(
  eventType: SSEEventType,
  handler: (event: SSEEvent) => void,
  options?: { filter?: (event: SSEEvent) => boolean; debug?: boolean }
) {
  useSSEEvents({
    eventTypes: [eventType],
    handlers: {
      [eventType]: (event) => {
        if (options?.filter && !options.filter(event)) {
          return;
        }
        handler(event);
      },
    },
    debug: options?.debug,
  });
}
