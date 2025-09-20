import { z } from "zod";

// Database validation schemas
export const DatabaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tenantId: z.string().min(1),
  createdAt: z.string(),
  sizeBytes: z.number().min(0),
  tableCount: z.number().min(0),
  lastAccessed: z.string().optional(),
});

export const DatabaseCreateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Database name can only contain letters, numbers, underscores, and hyphens",
  }),
  description: z.string().max(500).optional(),
});

export const DatabaseUpdateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  description: z.string().max(500).optional(),
});

export const DatabaseStatsSchema = z.object({
  id: z.string(),
  name: z.string(),
  sizeBytes: z.number().min(0),
  tableCount: z.number().min(0),
  queryCount: z.number().min(0),
  lastQueryAt: z.string().optional(),
});

export const DatabaseColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
  primaryKey: z.boolean(),
  foreignKey: z.object({
    table: z.string(),
    column: z.string(),
  }).optional(),
});

export const DatabaseTableSchema = z.object({
  name: z.string().min(1),
  columns: z.array(DatabaseColumnSchema),
  rowCount: z.number().min(0),
});

export const DatabaseRelationshipSchema = z.object({
  id: z.string(),
  fromTable: z.string(),
  fromColumn: z.string(),
  toTable: z.string(),
  toColumn: z.string(),
  type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

export const DatabaseSchemaSchema = z.object({
  tables: z.array(DatabaseTableSchema),
  relationships: z.array(DatabaseRelationshipSchema),
});

// Export types from schemas
export type DatabaseSchemaType = z.infer<typeof DatabaseSchema>;
export type DatabaseCreateSchemaType = z.infer<typeof DatabaseCreateSchema>;
export type DatabaseUpdateSchemaType = z.infer<typeof DatabaseUpdateSchema>;