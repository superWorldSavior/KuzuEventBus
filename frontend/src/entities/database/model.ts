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

export interface DatabaseSchema {
  tables: DatabaseTable[];
  relationships: DatabaseRelationship[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  rowCount: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface DatabaseRelationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
}