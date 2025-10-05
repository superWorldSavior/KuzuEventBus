import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi } from '../services/branchApi';
import { useApiErrorHandler } from '@/shared/hooks/useApiErrorHandler';
import { useBranchSSE } from './useBranchSSE';
import type { MutatingWin } from '@/features/graph/components/PitrTimeline';

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

  // Extract parent database name if databaseName is a branch
  // Branch naming: {parent}--branch--{branch_name}
  const getParentDatabase = (dbName: string | null): string | null => {
    if (!dbName) return null;
    const BRANCH_SEPARATOR = '--branch--';
    if (dbName.includes(BRANCH_SEPARATOR)) {
      return dbName.split(BRANCH_SEPARATOR)[0];
    }
    return dbName;
  };

  const parentDatabaseName = getParentDatabase(databaseName);
  
  // Detect if current database is a branch and extract branch name
  const getCurrentBranchName = (dbName: string | null): string | null => {
    if (!dbName) return null;
    const BRANCH_SEPARATOR = '--branch--';
    if (dbName.includes(BRANCH_SEPARATOR)) {
      return dbName.split(BRANCH_SEPARATOR)[1]; // Return branch name part
    }
    return null; // Not a branch
  };
  
  const currentBranchName = getCurrentBranchName(databaseName ?? null);
  console.log('[useBranching] Database:', databaseName, '→ Parent:', parentDatabaseName, '→ Current Branch:', currentBranchName);

  // Fetch branches from backend (always from parent database)
  const effectiveKey = parentDatabaseName ?? databaseId ?? null;
  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches', effectiveKey],
    queryFn: () => {
      console.log('[useBranching] Fetching branches for parent database:', parentDatabaseName);
      return parentDatabaseName ? branchApi.list(parentDatabaseName) : Promise.resolve({ branches: [], count: 0, database: '' });
    },
    enabled: !!parentDatabaseName,
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
  
  console.log('[useBranching] Branches loaded:', { count: branches.length, branches, activeBranchName });

  // Sync activeBranchName with current database if it's a branch
  useEffect(() => {
    if (currentBranchName && activeBranchName !== currentBranchName) {
      console.log('[useBranching] Auto-switching to detected branch:', currentBranchName);
      setActiveBranchName(currentBranchName);
    } else if (!currentBranchName && activeBranchName && !branches.find(b => b.name === activeBranchName)) {
      // If we're back on the parent database and the active branch doesn't exist, clear it
      console.log('[useBranching] Clearing active branch (branch no longer exists)');
      setActiveBranchName(null);
    }
  }, [currentBranchName, branches, activeBranchName]);

  // Auto-select the most recent branch when on parent database and branches exist
  useEffect(() => {
    if (!currentBranchName && !activeBranchName && branches.length > 0) {
      // Sort by createdAt descending and pick the most recent
      const mostRecentBranch = [...branches].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      console.log('[useBranching] Auto-selecting most recent branch:', mostRecentBranch.name);
      setActiveBranchName(mostRecentBranch.name);
    }
  }, [branches, currentBranchName, activeBranchName]);

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: async ({ fromTs: _fromTs, name }: { fromTs: string; name?: string }) => {
      if (!parentDatabaseName) throw new Error('No database selected');
      
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      // Compact base name: br-YYMMDDHHMMSS (no spaces, lowercase)
      const base = `br-${String(ts.getFullYear()).slice(2)}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
      // Backend enforces DatabaseName 3-40 chars for full name: <parent>--branch--<name>
      const FULL_SEPARATOR = '--branch--';
      const parentLen = (parentDatabaseName || '').length;
      const allowedSuffixLen = Math.max(3, 40 - parentLen - FULL_SEPARATOR.length);
      let autoName = base.slice(0, allowedSuffixLen).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (autoName.length < 3) autoName = 'brx';
      
      return branchApi.create({
        source_database: parentDatabaseName,
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

  // Centralized SSE listeners for Branching feature
  useBranchSSE({
    effectiveKey,
    activeBranchName,
    onSwitchActiveBranch: setActiveBranchName,
    onCleanupBranchWins: (branchName: string) => {
      setLocalWins((prev) => {
        const { [branchName]: _, ...rest } = prev;
        return rest;
      });
    },
    debug: true,
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
