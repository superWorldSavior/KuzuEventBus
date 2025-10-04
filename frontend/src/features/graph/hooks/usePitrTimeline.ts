import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/shared/api/client';
import type { WalWindow, MutatingWindow } from '@/shared/types/pitr';
import { MUTATING_QUERY_PATTERN, PITR_ANCHOR } from '@/shared/constants/pitr';

/**
 * Hook to manage PITR timeline state and operations
 */
export function usePitrTimeline(selectedDatabaseId: string | null) {
  const [mutatingWins, setMutatingWins] = useState<MutatingWindow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check if a query is mutating (modifies data)
   */
  const isMutatingQuery = useCallback((query: string): boolean => {
    return MUTATING_QUERY_PATTERN.test(query);
  }, []);

  /**
   * Load minute-level WAL windows with queries
   */
  const loadMutatingWindows = useCallback(async () => {
    if (!selectedDatabaseId) {
      setMutatingWins([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.get(
        `/api/v1/databases/${selectedDatabaseId}/pitr?window=minute&include_queries=true`
      );
      const wins: WalWindow[] = res.data?.wal_windows || [];
      
      // Filter to only mutating queries
      const muts = wins
        .filter((w) => {
          const q = w?.query;
          return q && typeof q === 'string' && q.trim() && isMutatingQuery(q);
        })
        .map((w) => ({
          start: w.start,
          end: w.end,
          query: w.query as string,
          files: w.files,
        }));

      setMutatingWins(muts);
    } catch (e) {
      console.error('[PITR] Failed to load mutating windows:', e);
      setMutatingWins([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatabaseId, isMutatingQuery]);

  /**
   * Get the latest mutating query (HEAD)
   */
  const getLatestMutatingQuery = useCallback((): string | null => {
    if (mutatingWins.length === 0) return null;
    return mutatingWins[mutatingWins.length - 1].query;
  }, [mutatingWins]);

  /**
   * Find mutating window by end timestamp
   */
  const findWindowByEnd = useCallback((endTs: string): MutatingWindow | null => {
    return mutatingWins.find((w) => w.end === endTs) || null;
  }, [mutatingWins]);

  /**
   * Derive a read-only preview query from a mutating query
   */
  const derivePreviewQuery = useCallback((query: string): string | null => {
    try {
      const text = query.trim().replace(/\s+/g, ' ');
      
      // Pattern 1: CREATE/MERGE (n:Label { ... })
      const nodePattern = /(CREATE|MERGE)\s*\((\w+):([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}\)/i;
      const nodeMatch = text.match(nodePattern);
      if (nodeMatch) {
        const varName = nodeMatch[2];
        const label = nodeMatch[3];
        const props = nodeMatch[4]?.trim();
        const propFilter = props ? `{ ${props} }` : '';
        return `MATCH (${varName}:${label} ${propFilter}) RETURN ${varName} LIMIT 100`;
      }

      // Pattern 2: CREATE/MERGE (a:LA? {..})-[r:TYPE]->(b:LB? {..})
      const relPattern = /(CREATE|MERGE)\s*\(\s*(\w+)(?::([A-Za-z_][A-Za-z0-9_]*))?\s*(\{[^}]*\})?\s*\)\s*-\s*\[\s*(\w+)?(?::([A-Za-z_][A-Za-z0-9_]*))?\s*\]\s*->\s*\(\s*(\w+)(?::([A-Za-z_][A-Za-z0-9_]*))?\s*(\{[^}]*\})?\s*\)/i;
      const relMatch = text.match(relPattern);
      if (relMatch) {
        const aVar = relMatch[2];
        const aLabel = relMatch[3] ? `:${relMatch[3]}` : '';
        const aProps = relMatch[4] ? ` ${relMatch[4]} ` : '';
        const rVar = relMatch[5] || 'r';
        const rType = relMatch[6] ? `:${relMatch[6]}` : '';
        const bVar = relMatch[7];
        const bLabel = relMatch[8] ? `:${relMatch[8]}` : '';
        const bProps = relMatch[9] ? ` ${relMatch[9]} ` : '';
        return `MATCH (${aVar}${aLabel}${aProps})-[${rVar}${rType}]->(${bVar}${bLabel}${bProps}) RETURN ${aVar}, ${rVar}, ${bVar} LIMIT 100`;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // Load mutating windows when database changes
  useEffect(() => {
    loadMutatingWindows();
  }, [loadMutatingWindows]);

  return {
    mutatingWins,
    isLoading,
    isMutatingQuery,
    getLatestMutatingQuery,
    findWindowByEnd,
    derivePreviewQuery,
    reload: loadMutatingWindows,
  };
}
