// Tenant entity - minimal types for future multi-tenant support

export type TenantId = string;
export type TenantName = string;

export interface Tenant {
  id: TenantId;
  name: TenantName;
  createdAt?: string; // ISO timestamp (optional in frontend)
}

// Conventions and simple validations (kept in sync with backend when added)
export const TENANT_ID_PREFIX = "tn_" as const;
export const TENANT_NAME_REGEX = /^[a-z0-9-]{3,32}$/;
export const MIN_TENANT_NAME_LENGTH = 3;
export const MAX_TENANT_NAME_LENGTH = 32;
