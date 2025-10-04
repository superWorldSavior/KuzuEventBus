import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi } from '../services/branchApi';
import { useApiErrorHandler } from '@/shared/hooks/useApiErrorHandler';
import { useBranchEvents } from '@/shared/hooks/useBranchEvents';
import type { MutatingWin } from '../components/PitrTimeline';

export interface Branch {
  name: string;
  full_name: string;
  color: string;
  parent: string;
  wins: MutatingWin[]; // mutations in this branch (local state for now)
  createdAt: string;
  description: string | null;
}

const DEFAULT_BRANCH_COLORS = [
  '#7c3aed', // violet
  '#2563eb', // blue
  '#059669', // green
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow
];

export function useBranching(databaseId: string | null, databaseName?: string | null) {
  const queryClient = useQueryClient();
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);
  const [localWins, setLocalWins] = useState<Record<string, MutatingWin[]>>({});
  const { handleError, handleSuccess } = useApiErrorHandler();

  // Fetch branches from backend
  const effectiveKey = databaseName ?? databaseId ?? null;
  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches', effectiveKey],
    queryFn: () => (databaseName ? branchApi.list(databaseName) : Promise.resolve({ branches: [], count: 0, database: '' })),
    enabled: !!databaseName,
    staleTime: 30000,
  });

  // Map backend branches to frontend format with colors
  const branches: Branch[] = (branchesData?.branches || []).map((b, idx) => ({
    name: b.name,
    full_name: b.full_name,
    color: DEFAULT_BRANCH_COLORS[idx % DEFAULT_BRANCH_COLORS.length],
    parent: b.parent,
    wins: localWins[b.name] || [],
    createdAt: b.created_at,
    description: b.description,
  }));

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: async ({ fromTs: _fromTs, name }: { fromTs: string; name?: string }) => {
      if (!databaseName) throw new Error('No database selected');
      
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      // Compact base name: br-YYMMDDHHMMSS (no spaces, lowercase)
      const base = `br-${String(ts.getFullYear()).slice(2)}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
      // Backend enforces DatabaseName 3-40 chars for full name: <parent>--branch--<name>
      const FULL_SEPARATOR = '--branch--';
      const parentLen = (databaseName || '').length;
      const allowedSuffixLen = Math.max(3, 40 - parentLen - FULL_SEPARATOR.length);
      let autoName = base.slice(0, allowedSuffixLen).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (autoName.length < 3) autoName = 'brx';
      
      return branchApi.create({
        source_database: databaseName,
        branch_name: name || autoName,
        // Utiliser le point sélectionné: 'latest' si on est sur HEAD, sinon timestamp
        from_snapshot: (_fromTs === 'LAST' ? 'latest' : _fromTs),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      setActiveBranchName(data.name);
      handleSuccess(`Branche ${data.name} créée`, 'Create Branch');
    },
    onError: (error) => {
      handleError(error, 'Create Branch');
    }
  });

  // Delete branch mutation
  const deleteBranchMutation = useMutation({
    mutationFn: (branchName: string) => branchApi.delete(branchName),
    onSuccess: (_, branchName) => {
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      if (activeBranchName === branchName) {
        setActiveBranchName(null);
      }
      // Clean local wins
      setLocalWins((prev) => {
        const { [branchName]: _, ...rest } = prev;
        return rest;
      });
    },
  });

  const createBranch = useCallback((fromTs: string, name?: string) => {
    return createBranchMutation.mutateAsync({ fromTs, name });
  }, [createBranchMutation]);

  const switchBranch = useCallback((branchName: string | null) => {
    setActiveBranchName(branchName);
  }, []);

  const closeBranch = useCallback((branchName: string) => {
    return deleteBranchMutation.mutateAsync(branchName);
  }, [deleteBranchMutation]);

  const addWinToBranch = useCallback((branchName: string, win: MutatingWin) => {
    setLocalWins((prev) => ({
      ...prev,
      [branchName]: [...(prev[branchName] || []), win],
    }));
  }, []);

  const activeBranch = branches.find((b) => b.name === activeBranchName) || null;

  // Listen for SSE events to auto-refresh branches
  useBranchEvents({
    onBranchCreated: (event) => {
      console.log('🌿 [SSE] Branch created:', event.branch_name);
      // Refetch branches list → branch appears in UI
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      // Auto-switch to new branch
      setActiveBranchName(event.branch_name);
    },
    onBranchMerged: (event) => {
      console.log('🔀 [SSE] Branch merged:', event.branch_name);
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      // Also invalidate databases since merge affects the target
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
    onBranchDeleted: (event) => {
      console.log('🗑️ [SSE] Branch deleted:', event.branch_name);
      // Refetch branches list → branch disappears from UI
      queryClient.invalidateQueries({ queryKey: ['branches', effectiveKey] });
      if (activeBranchName === event.branch_name) {
        setActiveBranchName(null);
      }
      // Clean local wins
      setLocalWins((prev) => {
        const { [event.branch_name]: _, ...rest } = prev;
        return rest;
      });
    },
    debug: true, // Enable debug logs
  });

  return {
    branches,
    activeBranch,
    activeBranchName,
    isLoading,
    createBranch,
    switchBranch,
    closeBranch,
    addWinToBranch,
  };
}
