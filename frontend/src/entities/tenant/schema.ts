import { z } from "zod";

// Tenant validation schemas
const TenantStatusEnum = z.enum(["active", "inactive", "suspended"]);

export const TenantSettingsSchema = z.object({
  timezone: z.string(),
  dateFormat: z.string(),
  theme: z.enum(["light", "dark", "auto"]),
  notifications: z.object({
    email: z.boolean(),
    webhook: z.boolean(),
    inApp: z.boolean(),
  }),
  queryDefaults: z.object({
    timeout: z.number().min(1),
    maxResults: z.number().min(1),
    autoSave: z.boolean(),
  }),
});

export const TenantLimitsSchema = z.object({
  maxDatabases: z.number().min(0),
  maxStorageBytes: z.number().min(0),
  maxQueriesPerHour: z.number().min(0),
  maxConcurrentQueries: z.number().min(1),
  maxQueryTimeout: z.number().min(1),
});

export const TenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Tenant name must contain only lowercase letters, numbers, and hyphens",
  }),
  displayName: z.string().max(100).optional(),
  customerId: z.string().min(1),
  status: TenantStatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
  settings: TenantSettingsSchema,
  limits: TenantLimitsSchema,
});

export const TenantCreateSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Tenant name must contain only lowercase letters, numbers, and hyphens",
  }),
  displayName: z.string().max(100).optional(),
  customerId: z.string().min(1),
  settings: TenantSettingsSchema.partial().optional(),
  limits: TenantLimitsSchema.partial().optional(),
});

export const TenantUpdateSchema = z.object({
  displayName: z.string().max(100).optional(),
  status: TenantStatusEnum.optional(),
  settings: TenantSettingsSchema.partial().optional(),
  limits: TenantLimitsSchema.partial().optional(),
});

// Export types from schemas
export type TenantSchemaType = z.infer<typeof TenantSchema>;
export type TenantCreateSchemaType = z.infer<typeof TenantCreateSchema>;
export type TenantUpdateSchemaType = z.infer<typeof TenantUpdateSchema>;