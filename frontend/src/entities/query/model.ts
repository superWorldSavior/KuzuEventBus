// Query Entity Model
export interface Query {
  id: string;
  content: string;
  databaseId: string;
  status: QueryStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  priority?: number;
  parameters?: Record<string, unknown>;
}

export type QueryStatus = 
  | "pending" 
  | "running" 
  | "completed" 
  | "failed" 
  | "cancelled" 
  | "timeout";

export interface QuerySubmit {
  databaseId: string;
  query: string;
  parameters?: Record<string, unknown>;
  timeoutSeconds?: number;
  priority?: number;
}

export interface QueryResult {
  transactionId: string;
  status: QueryStatus;
  results?: {
    columns: string[];
    rows: Array<Record<string, unknown>>;
    totalCount: number;
    executionTimeMs: number;
  };
  metadata?: {
    query: string;
    databaseId: string;
    executedAt: string;
    rowCount: number;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface QueryProgress {
  transactionId: string;
  percentageComplete: number;
  currentStep?: string;
  estimatedTimeRemainingMs?: number;
  processedRows?: number;
  totalRows?: number;
}

export interface QueryMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
  slowestQuery?: {
    id: string;
    query: string;
    durationMs: number;
  };
}