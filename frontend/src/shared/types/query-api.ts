// Query Execution Types

export interface QuerySubmitRequest {
  database_id: string;
  query: string;
  parameters?: Record<string, unknown>;
  timeout_seconds?: number;
  priority?: number;
}

export interface QuerySubmitResponse {
  transaction_id: string;
  database_id: string;
  query: string;
  status: TransactionStatus;
  created_at: string;
  estimated_duration_ms?: number;
}

export interface QueryStatusResponse {
  transaction_id: string;
  database_id: string;
  query: string;
  status: TransactionStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  progress_percentage?: number;
  error_message?: string;
}

export interface QueryResultsResponse {
  transaction_id: string;
  status: TransactionStatus;
  results: {
    columns: string[];
    rows: Array<Record<string, unknown>>;
    total_count: number;
    execution_time_ms: number;
  };
  metadata: {
    query: string;
    database_id: string;
    executed_at: string;
    row_count: number;
  };
}

export interface TransactionListResponse {
  transactions: Array<{
    transaction_id: string;
    database_id: string;
    database_name: string;
    query: string;
    status: TransactionStatus;
    created_at: string;
    completed_at?: string;
    duration_ms?: number;
    row_count?: number;
    error_message?: string;
  }>;
  total_count: number;
  page: number;
  per_page: number;
}

export interface QueryStatisticsResponse {
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  avg_duration_ms: number;
  queries_by_status: Record<TransactionStatus, number>;
  top_databases: Array<{
    database_id: string;
    database_name: string;
    query_count: number;
  }>;
}

export interface QueryCancelRequest {
  transaction_id: string;
}

export interface QueryValidationRequest {
  query: string;
  database_id: string;
}

export interface QueryValidationResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  estimated_complexity: "low" | "medium" | "high";
}

export interface NotificationMessage {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
}

// Transaction status enum
export type TransactionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timeout";

// Frontend-specific query types
export interface Query {
  id: string;
  databaseId: string;
  databaseName: string;
  query: string;
  parameters?: Record<string, unknown>;
  status: TransactionStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  rowCount?: number;
  errorMessage?: string;
  results?: QueryResults;
}

export interface QueryResults {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  executionTimeMs: number;
  metadata: {
    nodesCreated?: number;
    nodesDeleted?: number;
    relationshipsCreated?: number;
    relationshipsDeleted?: number;
    propertiesSet?: number;
  };
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  query: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: unknown;
  }>;
  category: string;
  tags: string[];
}

// D3.js Network Visualization Types
export interface NetworkNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
  group: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  id: string;
  source: string | NetworkNode;
  target: string | NetworkNode;
  type: string;
  properties: Record<string, unknown>;
  value: number;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  links: NetworkLink[];
  metadata: {
    nodeCount: number;
    linkCount: number;
    nodeTypes: string[];
    linkTypes: string[];
  };
}
