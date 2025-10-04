/**
 * PITR (Point-In-Time Recovery) constants
 */

export const PITR_ANCHOR = {
  LAST: 'LAST',
} as const;

export const PITR_WINDOW = {
  MINUTE: 'minute',
  HOUR: 'hour',
  DAY: 'day',
} as const;

export type PitrWindow = typeof PITR_WINDOW[keyof typeof PITR_WINDOW];

/**
 * Regex pattern to detect mutating Cypher queries
 */
export const MUTATING_QUERY_PATTERN = /(CREATE|MERGE|SET\s+|DELETE|REMOVE|LOAD|COPY|DROP|ALTER|ATTACH|IMPORT)/i;

/**
 * Default timeouts and intervals for PITR operations
 */
export const PITR_TIMEOUTS = {
  SSE_FALLBACK_MS: 10000, // 10 seconds
  GRAPH_REFRESH_DELAY_MS: 300,
  REFETCH_DELAY_MS: 300,
} as const;
