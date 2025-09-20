// Query entity barrel exports
export type { 
  Query,
  QueryStatus,
  QuerySubmit,
  QueryResult,
  QueryProgress,
  QueryMetrics
} from "./model";

export { 
  QuerySchema,
  QuerySubmitSchema,
  QueryResultSchema,
  QueryProgressSchema,
  QueryMetricsSchema,
  type QuerySchemaType,
  type QuerySubmitSchemaType,
  type QueryResultSchemaType
} from "./schema";

// Query constants
export const QUERY_STATUSES = [
  "pending", 
  "running", 
  "completed", 
  "failed", 
  "cancelled", 
  "timeout"
] as const;

export const QUERY_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10
} as const;

export const MAX_QUERY_LENGTH = 10000;
export const MAX_QUERY_TIMEOUT_SECONDS = 3600; // 1 hour
export const DEFAULT_QUERY_TIMEOUT_SECONDS = 300; // 5 minutes