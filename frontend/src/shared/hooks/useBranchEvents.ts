import { useSSEEvents, type SSEEvent } from './useSSEEvents';

export interface BranchCreatedEvent extends SSEEvent {
  event_type: 'branch_created';
  branch_name: string;
  full_name: string;
  parent_database: string;
  branch_database_id: string;
  snapshot_id: string;
}

export interface BranchMergedEvent extends SSEEvent {
  event_type: 'branch_merged';
  branch_name: string;
  target_database: string;
  snapshot_id: string;
}

export interface BranchDeletedEvent extends SSEEvent {
  event_type: 'branch_deleted';
  branch_name: string;
  branch_database_id: string;
}

export interface UseBranchEventsOptions {
  onBranchCreated?: (event: BranchCreatedEvent) => void;
  onBranchMerged?: (event: BranchMergedEvent) => void;
  onBranchDeleted?: (event: BranchDeletedEvent) => void;
  debug?: boolean;
}

/**
 * Hook to listen for branch-related SSE events.
 * 
 * @example
 * ```tsx
 * useBranchEvents({
 *   onBranchCreated: (event) => {
 *     toast.success(`Branch ${event.branch_name} created!`);
 *     refetchBranches();
 *   },
 *   onBranchMerged: (event) => {
 *     toast.success(`Branch merged successfully`);
 *     refetchDatabases();
 *   },
 * });
 * ```
 */
export function useBranchEvents({
  onBranchCreated,
  onBranchMerged,
  onBranchDeleted,
  debug,
}: UseBranchEventsOptions = {}) {
  useSSEEvents({
    eventTypes: ['branch_created', 'branch_merged', 'branch_deleted'],
    handlers: {
      branch_created: onBranchCreated as any,
      branch_merged: onBranchMerged as any,
      branch_deleted: onBranchDeleted as any,
    },
    debug,
  });
}
