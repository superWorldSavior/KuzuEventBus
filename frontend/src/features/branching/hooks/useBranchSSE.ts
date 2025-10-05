import { useQueryClient } from '@tanstack/react-query';
import { useBranchEvents } from '@/shared/hooks/useBranchEvents';

interface UseBranchSSEOptions {
  effectiveKey: string | null;
  activeBranchName: string | null;
  onSwitchActiveBranch: (branchName: string | null) => void;
  onCleanupBranchWins: (branchName: string) => void;
  debug?: boolean;
}

/**
 * Centralized SSE listeners for Branching feature.
 * Ensures branches list refreshes on create/merge/delete and updates local UI state.
 */
export function useBranchSSE({
  effectiveKey,
  activeBranchName,
  onSwitchActiveBranch,
  onCleanupBranchWins,
  debug = false,
}: UseBranchSSEOptions) {
  const queryClient = useQueryClient();

  useBranchEvents({
    onBranchCreated: (event) => {
      // Refetch branches list → branch appears in UI
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      // Auto-switch to new branch
      onSwitchActiveBranch(event.branch_name);
    },
    onBranchMerged: (event) => {
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      // Also invalidate databases since merge affects the target
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
    onBranchDeleted: (event) => {
      // Refetch branches list → branch disappears from UI
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      if (activeBranchName === event.branch_name) {
        onSwitchActiveBranch(null);
      }
      onCleanupBranchWins(event.branch_name);
    },
    debug,
  });
}
