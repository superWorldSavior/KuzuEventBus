// Query execution feature types
import type { Query, QueryStatus } from "@/entities/query";

// Query form types
export interface QuerySubmissionData {
  databaseId: string;
  query: string;
  parameters?: Record<string, unknown>;
  timeoutSeconds?: number;
  priority?: number;
}

export interface QueryValidationError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface QueryValidationResult {
  isValid: boolean;
  errors: QueryValidationError[];
  warnings: QueryValidationError[];
  suggestions: string[];
}

// Query execution types
export interface QueryExecution {
  transactionId: string;
  query: Query;
  startTime: string;
  endTime?: string;
  status: QueryStatus;
  progress?: number;
  currentStep?: string;
  estimatedTimeRemaining?: number;
}

export interface QueryExecutionPlan {
  query: string;
  plan: {
    type: "sequential" | "parallel" | "distributed";
    estimatedCost: number;
    estimatedRows: number;
    operations: QueryOperation[];
  };
  estimatedExecutionTime: string;
  cacheEligible: boolean;
}

export interface QueryOperation {
  id: string;
  type: "NodeScan" | "RelationshipScan" | "Filter" | "Projection" | "Join" | "Aggregation" | "Sort" | "Limit";
  table?: string;
  estimatedCost: number;
  estimatedRows: number;
  filter?: string;
  columns?: string[];
  dependencies?: string[];
}

// Query builder types
export interface QueryBuilderNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  position: { x: number; y: number };
  selected?: boolean;
}

export interface QueryBuilderRelationship {
  id: string;
  type: string;
  from: string;
  to: string;
  properties: Record<string, unknown>;
  selected?: boolean;
}

export interface QueryBuilderState {
  nodes: QueryBuilderNode[];
  relationships: QueryBuilderRelationship[];
  selectedElement?: string;
  zoom: number;
  pan: { x: number; y: number };
}

export interface QueryPattern {
  nodes: Array<{
    variable: string;
    labels: string[];
    properties?: Record<string, unknown>;
  }>;
  relationships: Array<{
    variable?: string;
    type?: string;
    direction: "incoming" | "outgoing" | "both";
    from: string;
    to: string;
    properties?: Record<string, unknown>;
  }>;
  where?: string[];
  returnClause: string[];
  orderBy?: Array<{ field: string; direction: "ASC" | "DESC" }>;
  limit?: number;
  skip?: number;
}

// Query template types
export interface QueryTemplate {
  id: string;
  name: string;
  query: string;
  description?: string;
  parameters?: Record<string, QueryTemplateParameter>;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  databaseId?: string;
  category?: "basic" | "advanced" | "analytics" | "maintenance";
  tags?: string[];
}

export interface QueryTemplateParameter {
  type: "string" | "number" | "boolean" | "any";
  default?: unknown;
  description?: string;
  required?: boolean;
  options?: unknown[];
}

// Query results types
export interface QueryResultsView {
  format: "table" | "graph" | "json" | "raw";
  pageSize: number;
  currentPage: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
  groupBy?: string[];
}

export interface QueryResultsExport {
  format: "csv" | "json" | "excel" | "parquet";
  includeHeaders?: boolean;
  limit?: number;
  columns?: string[];
}

// Query performance types
export interface QueryPerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  ioOperations: number;
  cacheHits: number;
  cacheMisses: number;
  indexUsage: Array<{
    index: string;
    hits: number;
    effectiveness: number;
  }>;
}

export interface QueryOptimizationSuggestion {
  type: "index" | "query_structure" | "parameter" | "caching";
  message: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "moderate" | "complex";
  suggestedQuery?: string;
  explanation?: string;
}

// Query statistics types
export interface QueryStatistics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgExecutionTimeMs: number;
  totalExecutionTimeMs: number;
  cacheHitRatio: number;
  timeframe: "1h" | "24h" | "7d" | "30d";
  queryTypes: {
    read: number;
    write: number;
  };
  performanceMetrics: {
    fastest: { query: string; timeMs: number };
    slowest: { query: string; timeMs: number };
    mostFrequent: { query: string; count: number };
  };
  errorBreakdown: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

// Query editor types
export interface QueryEditorState {
  content: string;
  cursorPosition: { line: number; column: number };
  selectedText?: string;
  syntaxErrors: QueryValidationError[];
  warnings: QueryValidationError[];
  suggestions: Array<{
    text: string;
    type: "keyword" | "function" | "property" | "variable";
    description?: string;
  }>;
}

export interface QueryAutocompletion {
  suggestions: Array<{
    label: string;
    insertText: string;
    detail?: string;
    documentation?: string;
    kind: "keyword" | "function" | "property" | "variable" | "label" | "snippet";
  }>;
  activeIndex: number;
  position: { x: number; y: number };
}

// Query sharing and collaboration
export interface SharedQuery {
  id: string;
  query: Query;
  sharedBy: string;
  sharedWith: string[];
  permissions: ("read" | "execute" | "modify")[];
  sharedAt: string;
  expiresAt?: string;
  accessCount: number;
}

export interface QueryComment {
  id: string;
  queryId: string;
  author: string;
  content: string;
  createdAt: string;
  line?: number;
  resolved?: boolean;
}

// Query workspace types
export interface QueryWorkspace {
  id: string;
  name: string;
  description?: string;
  queries: string[]; // Query IDs
  sharedWith: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  settings: {
    autoSave: boolean;
    defaultDatabase?: string;
    theme?: "light" | "dark";
    fontSize?: number;
    tabSize?: number;
  };
}

// Query execution context
export interface QueryExecutionContext {
  databaseId: string;
  userId?: string;
  sessionId?: string;
  environment?: "development" | "staging" | "production";
  debugMode?: boolean;
  enableProfiling?: boolean;
  maxExecutionTime?: number;
  maxMemoryUsage?: number;
}