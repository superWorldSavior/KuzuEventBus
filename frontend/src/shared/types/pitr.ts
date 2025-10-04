/**
 * PITR (Point-In-Time Recovery) type definitions
 */

export interface WalWindow {
  start: string;
  end: string;
  files?: number;
  query?: string;
}

export interface MutatingWindow extends WalWindow {
  query: string; // Required for mutating windows
}

export interface PitrPreviewParams {
  target_timestamp: string;
  preview_query: string;
}

export interface PitrPreviewResponse {
  results?: QueryPreviewResult[];
  metadata?: {
    timestamp: string;
    query: string;
  };
}

export interface QueryPreviewResult {
  [key: string]: unknown;
}

export type GraphViewMode = 'graph' | 'table';

export interface DashboardState {
  selectedDatabaseId: string | null;
  selectedPitrPoint: string | null;
  currentAnchorTimestamp: string | null;
  graphViewMode: GraphViewMode;
  aggregationMode: boolean;
  isExecuting: boolean;
  isRestoring: boolean;
}

export interface SSEQueryEvent {
  event_type: 'completed' | 'failed' | 'timeout';
  transaction_id: string;
  database_id?: string;
  query?: string;
  error?: string;
  execution_time_ms?: string;
  rows_count?: string;
}
