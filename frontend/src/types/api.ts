// Backend API Types matching the FastAPI DTOs

// Backend Integration Status Types
export interface BackendEndpointStatus {
  endpoint: string;
  status: 'implemented' | 'not_implemented' | 'missing' | 'unknown';
  lastChecked?: string;
}

export interface BackendIntegrationReport {
  totalEndpoints: number;
  implemented: number;
  notImplemented: number;
  missing: number;
  unknown: number;
  endpoints: BackendEndpointStatus[];
  generatedAt: string;
}

// Customer Management Types
export interface CustomerRegistrationRequest {
  tenant_name: string;
  organization_name: string;
  admin_email: string;
}

export interface CustomerRegistrationResponse {
  customer_id: string;
  tenant_name: string;
  organization_name: string;
  admin_email: string;
  api_key: string;
  subscription_status: string;
  created_at: string;
}

export interface CustomerAccountResponse {
  customer_id: string;
  tenant_name: string;
  organization_name: string;
  admin_email: string;
  subscription_status: string;
  created_at: string;
  last_login?: string;
}

export interface ApiKeyCreateRequest {
  key_name: string;
  permissions: string[];
}

export interface ApiKeyCreateResponse {
  api_key: string;
  key_name: string;
  created_at: string;
  permissions: string[];
  last_used?: string;
}

export interface ApiKeyListResponse {
  api_keys: Array<{
    api_key: string;
    key_name: string;
    created_at: string;
    permissions: string[];
    last_used?: string;
    is_active: boolean;
  }>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SuccessResponse {
  message: string;
  data?: Record<string, unknown>;
}

// Health check responses
export interface HealthResponse {
  status: string;
  service?: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  tenant_id: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  organization_name: string;
  role: string;
}

// Database Management Types (for missing backend endpoints)
export interface DatabaseCreateRequest {
  name: string;
  description?: string;
}

export interface DatabaseUpdateRequest {
  name?: string;
  description?: string;
}

export interface DatabaseResponse {
  database_id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_at: string;
  updated_at?: string;
  size_bytes: number;
  status: 'active' | 'inactive' | 'provisioning' | 'error';
}

export interface DatabaseListResponse {
  databases: DatabaseResponse[];
  total_count: number;
  total_size_bytes: number;
}

// Query Execution Types (for missing backend endpoints)
export interface QueryResultsResponse {
  transaction_id: string;
  results: any[];
  columns: string[];
  row_count: number;
  execution_time_ms: number;
  has_more: boolean;
}

export interface QueryCancelRequest {
  reason?: string;
}

// Analytics Types (for missing backend endpoints)  
export interface DashboardStatsResponse {
  totalDatabases: number;
  totalStorageGB: number;
  queriesToday: number;
  avgQueryTimeMs: number;
  activeConnections: number;
  lastUpdated: string;
}

export interface RecentQueryResponse {
  id: string;
  database: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  executionTime?: number;
  timestamp: string;
  resultCount?: number;
}

export interface RecentActivityResponse {
  id: string;
  type: 'query_executed' | 'database_created' | 'file_uploaded' | 'user_login';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetricsResponse {
  queryPerformance: Array<{
    timestamp: string;
    avgTime: number;
    queryCount: number;
  }>;
  storageUsage: Array<{
    timestamp: string;
    usageGB: number;
  }>;
}

// File Upload Types (for missing backend endpoints)
export interface FileUploadRequest {
  file: File;
  file_type?: 'csv' | 'json' | 'cypher';
  import_options?: {
    has_headers?: boolean;
    delimiter?: string;
    create_nodes?: boolean;
    create_relationships?: boolean;
  };
}

export interface FileUploadResponse {
  success: boolean;
  file_id: string;
  message: string;
  records_imported: number;
  errors?: string[];
}
