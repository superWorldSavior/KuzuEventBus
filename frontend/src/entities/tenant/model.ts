// Tenant Entity Model
export interface Tenant {
  id: string;
  name: string;
  displayName?: string;
  customerId: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  settings: TenantSettings;
  limits: TenantLimits;
}

export type TenantStatus = "active" | "inactive" | "suspended";

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  theme: "light" | "dark" | "auto";
  notifications: {
    email: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  queryDefaults: {
    timeout: number;
    maxResults: number;
    autoSave: boolean;
  };
}

export interface TenantLimits {
  maxDatabases: number;
  maxStorageBytes: number;
  maxQueriesPerHour: number;
  maxConcurrentQueries: number;
  maxQueryTimeout: number;
}

export interface TenantCreate {
  name: string;
  displayName?: string;
  customerId: string;
  settings?: Partial<TenantSettings>;
  limits?: Partial<TenantLimits>;
}

export interface TenantUpdate {
  displayName?: string;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
  limits?: Partial<TenantLimits>;
}