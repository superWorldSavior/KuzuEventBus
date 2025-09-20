// Database management feature types
import type { Database, DatabaseStats } from "@/entities/database";

// Form types for database management
export interface CreateDatabaseFormData {
  name: string;
  description?: string;
}

export interface UpdateDatabaseFormData {
  name?: string;
  description?: string;
}

// File upload types
export interface DatabaseFileUpload {
  file: File;
  databaseId: string;
  progress?: number;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
}

export interface FileUploadResult {
  success: boolean;
  fileId: string;
  message: string;
  recordsImported: number;
}

// Database list view types
export interface DatabaseListFilter {
  search?: string;
  sortBy?: "name" | "createdAt" | "sizeBytes" | "lastAccessed";
  sortOrder?: "asc" | "desc";
  showOnlyRecent?: boolean;
}

export interface DatabaseListViewOptions {
  viewMode: "grid" | "list";
  itemsPerPage: number;
  currentPage: number;
}

// Database metrics types
export interface DatabaseMetricsOverview {
  totalDatabases: number;
  totalSizeBytes: number;
  totalTables: number;
  recentlyAccessed: Database[];
  largestDatabases: Database[];
  mostActive: DatabaseStats[];
}

// Database schema visualization types
export interface SchemaNode {
  id: string;
  label: string;
  properties: SchemaProperty[];
  count: number;
  x?: number;
  y?: number;
}

export interface SchemaRelationship {
  id: string;
  type: string;
  from: string;
  to: string;
  properties: SchemaProperty[];
  count: number;
}

export interface SchemaProperty {
  name: string;
  type: string;
  required?: boolean;
  indexed?: boolean;
  unique?: boolean;
}

export interface SchemaVisualization {
  nodes: SchemaNode[];
  relationships: SchemaRelationship[];
  layout: "hierarchical" | "force" | "circular";
}

// Database connection types
export interface DatabaseConnection {
  id: string;
  databaseId: string;
  status: "connected" | "connecting" | "disconnected" | "error";
  lastConnected?: string;
  connectionInfo?: {
    host: string;
    port: number;
    protocol: string;
  };
}

// Database operation history
export interface DatabaseOperation {
  id: string;
  databaseId: string;
  type: "create" | "update" | "delete" | "upload" | "query";
  status: "pending" | "success" | "failed";
  timestamp: string;
  details?: Record<string, unknown>;
  error?: string;
}

// Export/import types
export interface DatabaseExportRequest {
  databaseId: string;
  format: "json" | "csv" | "parquet";
  tables?: string[];
  compressed?: boolean;
}

export interface DatabaseImportRequest {
  databaseId: string;
  format: "json" | "csv" | "parquet";
  file: File;
  mapping?: Record<string, string>;
  options?: {
    skipHeaders?: boolean;
    delimiter?: string;
    encoding?: string;
  };
}

// Database validation types
export interface DatabaseValidationResult {
  isValid: boolean;
  errors: DatabaseValidationError[];
  warnings: DatabaseValidationWarning[];
  statistics: {
    totalNodes: number;
    totalRelationships: number;
    missingProperties: number;
    orphanedNodes: number;
  };
}

export interface DatabaseValidationError {
  type: "schema" | "data" | "constraint" | "reference";
  severity: "high" | "medium" | "low";
  message: string;
  location?: {
    table?: string;
    column?: string;
    row?: number;
  };
}

export interface DatabaseValidationWarning {
  type: "performance" | "data_quality" | "recommendation";
  message: string;
  suggestion?: string;
}

// Database access control
export interface DatabasePermission {
  databaseId: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer";
  permissions: DatabasePermissionType[];
  grantedAt: string;
  grantedBy: string;
}

export type DatabasePermissionType = 
  | "read"
  | "write"
  | "delete"
  | "schema_modify"
  | "user_manage"
  | "export"
  | "import";

// Database backup types
export interface DatabaseBackup {
  id: string;
  databaseId: string;
  timestamp: string;
  size: number;
  status: "pending" | "completed" | "failed";
  type: "full" | "incremental";
  retentionDays: number;
}

export interface DatabaseBackupRequest {
  databaseId: string;
  type: "full" | "incremental";
  description?: string;
  retentionDays?: number;
}