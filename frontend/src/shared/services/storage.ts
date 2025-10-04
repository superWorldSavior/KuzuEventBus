/**
 * Centralized localStorage service with type safety and error handling
 * Provides a consistent API for persisting application state
 */

export class StorageService {
  /**
   * Get a value from localStorage with type safety
   * @param key Storage key
   * @param fallback Default value if key doesn't exist or parsing fails
   * @returns Parsed value or fallback
   */
  static get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`[Storage] Failed to get "${key}":`, error);
      return fallback;
    }
  }

  /**
   * Set a value in localStorage with automatic JSON serialization
   * @param key Storage key
   * @param value Value to store
   */
  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[Storage] Failed to set "${key}":`, error);
    }
  }

  /**
   * Remove a value from localStorage
   * @param key Storage key
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Failed to remove "${key}":`, error);
    }
  }

  /**
   * Clear all localStorage data
   */
  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[Storage] Failed to clear storage:', error);
    }
  }

  /**
   * Check if a key exists in localStorage
   * @param key Storage key
   * @returns true if key exists
   */
  static has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Storage keys used across the application
 * Centralized to avoid typos and enable refactoring
 */
export const STORAGE_KEYS = {
  // Auth
  API_KEY: 'kuzu_api_key',
  
  // Dashboard preferences
  GRAPH_VIEW_MODE: 'graphViewMode',
  AGGREGATION_MODE: 'aggregationMode',
  
  // PITR state
  QUERY_BY_WAL_END: 'queryByWalEnd',
  LAST_QUERY_BY_DB: 'lastQueryByDb',
  
  // Execution/Branch context
  EXECUTION_CONTEXT: 'executionContext', // 'prod' | 'preview' | 'branch'
  BRANCH_CONTEXT: 'branchContext', // { name, color, fromTs, wins }
} as const;
