import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";
import type { Database, DatabaseCreate, DatabaseUpdate, DatabaseStats } from "@/entities/database";

// Database management API calls
export const databaseApi = {
  // Get all databases for the current tenant
  async getDatabases(): Promise<Database[]> {
    const endpoint = "GET /api/v1/databases";
    const mockData: Database[] = [
      {
        id: "db-1",
        name: "social-network",
        description: "Social media relationship data",
        tenantId: "tenant-123",
        createdAt: "2024-01-15T10:30:00Z",
        sizeBytes: 1073741824, // 1GB
        tableCount: 5,
        lastAccessed: "2024-01-20T14:22:00Z",
      },
      {
        id: "db-2",
        name: "ecommerce-db",
        description: "E-commerce product and order data",
        tenantId: "tenant-123",
        createdAt: "2024-01-10T09:15:00Z",
        sizeBytes: 2147483648, // 2GB
        tableCount: 8,
        lastAccessed: "2024-01-19T16:45:00Z",
      },
      {
        id: "db-3",
        name: "inventory-system",
        description: "Warehouse inventory management",
        tenantId: "tenant-123",
        createdAt: "2024-01-18T13:20:00Z",
        sizeBytes: 536870912, // 512MB
        tableCount: 3,
        lastAccessed: "2024-01-20T11:30:00Z",
      },
      {
        id: "db-4",
        name: "financial-network",
        description: "Financial transaction network analysis",
        tenantId: "tenant-123",
        createdAt: "2024-01-12T11:45:00Z",
        sizeBytes: 3221225472, // 3GB
        tableCount: 12,
        lastAccessed: "2024-01-18T09:22:00Z",
      },
    ];
    
    try {
      const response = await apiClient.get("/api/v1/databases");
      markEndpointWorking(endpoint);
      
      // Transform API response to match Database entity
      return response.data.map((db: any) => ({
        id: db.database_id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id || 'unknown',
        createdAt: db.created_at,
        sizeBytes: db.size_bytes,
        tableCount: db.table_count,
        lastAccessed: db.last_accessed,
      }));
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Create a new database
  async createDatabase(data: DatabaseCreate): Promise<Database> {
    const endpoint = "POST /api/v1/databases";
    const mockResponse: Database = {
      id: `db-${Date.now()}`,
      name: data.name,
      description: data.description,
      tenantId: 'tenant-123',
      createdAt: new Date().toISOString(),
      sizeBytes: 0,
      tableCount: 0,
    };
    
    try {
      const response = await apiClient.post("/api/v1/databases", data);
      markEndpointWorking(endpoint);
      
      const db = response.data;
      return {
        id: db.database_id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id || 'unknown',
        createdAt: db.created_at,
        sizeBytes: db.size_bytes || 0,
        tableCount: db.table_count || 0,
      };
    } catch (error) {
      return handleApiError(endpoint, error, mockResponse);
    }
  },

  // Get details for a specific database
  async getDatabase(databaseId: string): Promise<Database> {
    const endpoint = `GET /api/v1/databases/${databaseId}`;
    const mockData: Database = {
      id: databaseId,
      name: "social-network",
      description: "Social media relationship data",
      tenantId: "tenant-123",
      createdAt: "2024-01-15T10:30:00Z",
      sizeBytes: 1073741824,
      tableCount: 5,
      lastAccessed: "2024-01-20T14:22:00Z",
    };
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}`);
      markEndpointWorking(endpoint);
      
      const db = response.data;
      return {
        id: db.database_id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id,
        createdAt: db.created_at,
        sizeBytes: db.size_bytes,
        tableCount: db.table_count,
        lastAccessed: db.last_accessed,
      };
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Update database metadata
  async updateDatabase(databaseId: string, data: DatabaseUpdate): Promise<Database> {
    const endpoint = `PUT /api/v1/databases/${databaseId}`;
    const mockData: Database = {
      id: databaseId,
      name: data.name || 'updated-database',
      description: data.description,
      tenantId: 'tenant-123',
      createdAt: '2024-01-15T10:30:00Z',
      sizeBytes: 1073741824,
      tableCount: 5,
      lastAccessed: new Date().toISOString(),
    };
    
    try {
      const response = await apiClient.put(`/api/v1/databases/${databaseId}`, data);
      markEndpointWorking(endpoint);
      
      const db = response.data;
      return {
        id: db.database_id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id,
        createdAt: db.created_at,
        sizeBytes: db.size_bytes,
        tableCount: db.table_count,
        lastAccessed: db.last_accessed,
      };
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Delete a database
  async deleteDatabase(databaseId: string): Promise<{ success: boolean; message: string }> {
    const endpoint = `DELETE /api/v1/databases/${databaseId}`;
    const mockData = { success: true, message: "Database deleted successfully" };
    
    try {
      const response = await apiClient.delete(`/api/v1/databases/${databaseId}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Upload file to database
  async uploadFile(
    databaseId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    fileId: string;
    message: string;
    recordsImported: number;
  }> {
    const endpoint = `POST /api/v1/databases/${databaseId}/upload`;
    const mockData = {
      success: true,
      fileId: `file-${Date.now()}`,
      message: "File uploaded successfully",
      recordsImported: Math.floor(Math.random() * 10000) + 1000,
    };
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
        }
      );
      markEndpointWorking(endpoint);
      
      return {
        success: response.data.success,
        fileId: response.data.file_id,
        message: response.data.message,
        recordsImported: response.data.records_imported,
      };
    } catch (error) {
      // Simulate upload progress for demo purposes when using mock data
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress(i);
        }
      }
      
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Get database statistics
  async getDatabaseStats(databaseId: string): Promise<DatabaseStats> {
    const endpoint = `GET /api/v1/databases/${databaseId}/stats`;
    const mockData: DatabaseStats = {
      id: databaseId,
      name: "social-network",
      sizeBytes: 1073741824,
      tableCount: 5,
      queryCount: 142,
      lastQueryAt: "2024-01-20T14:22:00Z",
    };
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/stats`);
      markEndpointWorking(endpoint);
      
      const stats = response.data;
      return {
        id: stats.database_id,
        name: stats.name,
        sizeBytes: stats.size_bytes,
        tableCount: stats.table_count,
        queryCount: stats.query_count,
        lastQueryAt: stats.last_query_at,
      };
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Get database schema information
  async getDatabaseSchema(databaseId: string) {
    const endpoint = `GET /api/v1/databases/${databaseId}/schema`;
    const mockData = {
      tables: [
        {
          name: "Person",
          columns: [
            { name: "id", type: "string", nullable: false, primaryKey: true },
            { name: "name", type: "string", nullable: false, primaryKey: false },
            { name: "age", type: "int64", nullable: true, primaryKey: false },
            { name: "email", type: "string", nullable: true, primaryKey: false },
          ],
          rowCount: 1250,
        },
        {
          name: "Post",
          columns: [
            { name: "id", type: "string", nullable: false, primaryKey: true },
            { name: "content", type: "string", nullable: false, primaryKey: false },
            { name: "timestamp", type: "timestamp", nullable: false, primaryKey: false },
          ],
          rowCount: 3421,
        },
      ],
      relationships: [
        {
          id: "follows-rel",
          fromTable: "Person",
          fromColumn: "id",
          toTable: "Person",
          toColumn: "id",
          type: "one-to-many" as const,
        },
        {
          id: "posted-rel",
          fromTable: "Person",
          fromColumn: "id",
          toTable: "Post",
          toColumn: "author_id",
          type: "one-to-many" as const,
        },
      ],
    };
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/schema`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Upload file to database
  async uploadDatabaseFile(
    databaseId: string,
    file: File,
    onProgress?: (progress: number) => void
  ) {
    const endpoint = `POST /api/v1/databases/${databaseId}/upload`;
    const mockData = {
      success: true,
      file_id: `file-${Date.now()}`,
      message: "File uploaded successfully",
      records_imported: Math.floor(Math.random() * 10000) + 1000,
    };
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: onProgress ? (progressEvent: any) => {
            const total = progressEvent.total || 0;
            const current = progressEvent.loaded || 0;
            onProgress(Math.round((current / total) * 100));
          } : undefined,
        }
      );
      
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },
};