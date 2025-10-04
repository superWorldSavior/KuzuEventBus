// Database Entity Model
export interface Database {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdAt: string;
  sizeBytes: number;
  tableCount: number;
  lastAccessed?: string;
}

export interface DatabaseCreate {
  name: string;
  description?: string;
}

export interface DatabaseUpdate {
  name?: string;
  description?: string;
}

export interface DatabaseStats {
  id: string;
  name: string;
  sizeBytes: number;
  tableCount: number;
  queryCount: number;
  lastQueryAt?: string;
}