// Tenant entity barrel exports
export type { 
  Tenant,
  TenantStatus,
  TenantSettings,
  TenantLimits,
  TenantCreate,
  TenantUpdate
} from "./model";

export { 
  TenantSchema,
  TenantCreateSchema,
  TenantUpdateSchema,
  TenantSettingsSchema,
  TenantLimitsSchema,
  type TenantSchemaType,
  type TenantCreateSchemaType,
  type TenantUpdateSchemaType
} from "./schema";

// Import types for use in constants
import type { TenantSettings, TenantLimits } from "./model";

// Tenant constants
export const TENANT_STATUSES = [
  "active",
  "inactive", 
  "suspended"
] as const;

export const TENANT_THEMES = [
  "light",
  "dark",
  "auto"
] as const;

export const TENANT_NAME_REGEX = /^[a-z0-9-]+$/;
export const MAX_TENANT_NAME_LENGTH = 50;
export const MIN_TENANT_NAME_LENGTH = 3;

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
  theme: "light",
  notifications: {
    email: true,
    webhook: false,
    inApp: true,
  },
  queryDefaults: {
    timeout: 300, // 5 minutes
    maxResults: 1000,
    autoSave: true,
  },
};

export const DEFAULT_TENANT_LIMITS: TenantLimits = {
  maxDatabases: 10,
  maxStorageBytes: 1024 * 1024 * 1024 * 5, // 5GB
  maxQueriesPerHour: 1000,
  maxConcurrentQueries: 5,
  maxQueryTimeout: 3600, // 1 hour
};