import { z } from "zod";

// Query validation schemas
const QueryStatusEnum = z.enum([
  "pending", 
  "running", 
  "completed", 
  "failed", 
  "cancelled", 
  "timeout"
]);

export const QuerySchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  databaseId: z.string().min(1),
  status: QueryStatusEnum,
  createdAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationMs: z.number().min(0).optional(),
  errorMessage: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
  parameters: z.record(z.unknown()).optional(),
});

export const QuerySubmitSchema = z.object({
  databaseId: z.string().min(1),
  query: z.string().min(1).max(10000),
  parameters: z.record(z.unknown()).optional(),
  timeoutSeconds: z.number().min(1).max(3600).optional(), // 1 second to 1 hour
  priority: z.number().min(1).max(10).optional(),
});

export const QueryResultSchema = z.object({
  transactionId: z.string(),
  status: QueryStatusEnum,
  results: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.record(z.unknown())),
    totalCount: z.number().min(0),
    executionTimeMs: z.number().min(0),
  }).optional(),
  metadata: z.object({
    query: z.string(),
    databaseId: z.string(),
    executedAt: z.string(),
    rowCount: z.number().min(0),
  }).optional(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }).optional(),
});

export const QueryProgressSchema = z.object({
  transactionId: z.string(),
  percentageComplete: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  estimatedTimeRemainingMs: z.number().min(0).optional(),
  processedRows: z.number().min(0).optional(),
  totalRows: z.number().min(0).optional(),
});

export const QueryMetricsSchema = z.object({
  totalQueries: z.number().min(0),
  successfulQueries: z.number().min(0),
  failedQueries: z.number().min(0),
  averageExecutionTime: z.number().min(0),
  slowestQuery: z.object({
    id: z.string(),
    query: z.string(),
    durationMs: z.number().min(0),
  }).optional(),
});

// Export types from schemas
export type QuerySchemaType = z.infer<typeof QuerySchema>;
export type QuerySubmitSchemaType = z.infer<typeof QuerySubmitSchema>;
export type QueryResultSchemaType = z.infer<typeof QueryResultSchema>;