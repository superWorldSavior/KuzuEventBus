// Database Management Types

export interface DatabaseCreateRequest {
  name: string;
  description?: string;
}

export interface DatabaseCreateResponse {
  database_id: string;
  name: string;
  description?: string;
  created_at: string;
  size_bytes: number;
  table_count: number;
}

export interface DatabaseListResponse {
  database_id: string;
  name: string;
  description?: string;
  created_at: string;
  size_bytes: number;
  table_count: number;
  last_accessed?: string;
}

export interface DatabaseInfoResponse {
  database_id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_at: string;
  size_bytes: number;
  table_count: number;
  schema?: Record<string, unknown>;
  last_accessed?: string;
}

export interface FileUploadRequest {
  file_name: string;
  content_type?: string;
}

export interface FileUploadResponse {
  upload_url: string;
  file_id: string;
  expires_at: string;
}

export interface DatabaseStatsResponse {
  total_databases: number;
  total_size_bytes: number;
  total_queries_executed: number;
  avg_query_duration_ms: number;
}

// Frontend-specific database types
export interface Database {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdAt: Date;
  sizeBytes: number;
  tableCount: number;
  schema?: DatabaseSchema;
  lastAccessed?: Date;
  status: "active" | "inactive" | "error";
}

export interface DatabaseSchema {
  nodes: Array<{
    label: string;
    properties: Array<{
      name: string;
      type: string;
      required: boolean;
    }>;
    count: number;
  }>;
  relationships: Array<{
    type: string;
    from: string;
    to: string;
    properties: Array<{
      name: string;
      type: string;
      required: boolean;
    }>;
    count: number;
  }>;
}

export interface DatabaseStats {
  totalNodes: number;
  totalRelationships: number;
  nodeLabels: string[];
  relationshipTypes: string[];
  lastUpdated: Date;
}
