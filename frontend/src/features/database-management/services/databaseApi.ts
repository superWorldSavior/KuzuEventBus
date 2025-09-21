import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";
import type { Database, DatabaseCreate, DatabaseUpdate, DatabaseStats } from "@/entities/database";

// Database management API calls
export const databaseApi = {
  // Get all databases for the current tenant
  async getDatabases(): Promise<Database[]> {
    const endpoint = "GET /api/v1/databases";
    
    try {
      const response = await apiClient.get("/api/v1/databases");
      markEndpointWorking(endpoint);
      
      // Transform API response to match Database entity
      return response.data.map((db: any) => ({
        id: db.database_id || db.id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id || db.tenantId || 'unknown',
        createdAt: db.created_at || db.createdAt,
        sizeBytes: db.size_bytes || db.sizeBytes || 0,
        tableCount: db.table_count || db.tableCount || 0,
        lastAccessed: db.last_accessed || db.lastAccessed,
      }));
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Create a new database
  async createDatabase(data: DatabaseCreate): Promise<Database> {
    const endpoint = "POST /api/v1/databases";
    
    try {
      const response = await apiClient.post("/api/v1/databases", data);
      markEndpointWorking(endpoint);
      
      const db = response.data;
      return {
        id: db.database_id || db.id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id || db.tenantId || 'unknown',
        createdAt: db.created_at || db.createdAt,
        sizeBytes: db.size_bytes || db.sizeBytes || 0,
        tableCount: db.table_count || db.tableCount || 0,
        lastAccessed: db.last_accessed || db.lastAccessed,
      };
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Get details for a specific database
  async getDatabase(databaseId: string): Promise<Database> {
    const endpoint = `GET /api/v1/databases/${databaseId}`;
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}`);
      markEndpointWorking(endpoint);
      
      const db = response.data;
      return {
        id: db.database_id || db.id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id || db.tenantId,
        createdAt: db.created_at || db.createdAt,
        sizeBytes: db.size_bytes || db.sizeBytes || 0,
        tableCount: db.table_count || db.tableCount || 0,
        lastAccessed: db.last_accessed || db.lastAccessed,
      };
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Update database metadata
  async updateDatabase(databaseId: string, data: DatabaseUpdate): Promise<Database> {
    const endpoint = `PUT /api/v1/databases/${databaseId}`;
    
    try {
      const response = await apiClient.put(`/api/v1/databases/${databaseId}`, data);
      markEndpointWorking(endpoint);
      
      const db = response.data;
      return {
        id: db.database_id || db.id,
        name: db.name,
        description: db.description,
        tenantId: db.tenant_id || db.tenantId,
        createdAt: db.created_at || db.createdAt,
        sizeBytes: db.size_bytes || db.sizeBytes || 0,
        tableCount: db.table_count || db.tableCount || 0,
        lastAccessed: db.last_accessed || db.lastAccessed,
      };
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Delete a database
  async deleteDatabase(databaseId: string): Promise<{ success: boolean; message: string }> {
    const endpoint = `DELETE /api/v1/databases/${databaseId}`;
    
    try {
      const response = await apiClient.delete(`/api/v1/databases/${databaseId}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
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
        fileId: response.data.file_id || response.data.fileId,
        message: response.data.message,
        recordsImported: response.data.records_imported || response.data.recordsImported,
      };
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Get database statistics
  async getDatabaseStats(databaseId: string): Promise<DatabaseStats> {
    const endpoint = `GET /api/v1/databases/${databaseId}/stats`;
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/stats`);
      markEndpointWorking(endpoint);
      
      const stats = response.data;
      return {
        id: stats.database_id || stats.id,
        name: stats.name,
        sizeBytes: stats.size_bytes || stats.sizeBytes || 0,
        tableCount: stats.table_count || stats.tableCount || 0,
        queryCount: stats.query_count || stats.queryCount || 0,
        lastQueryAt: stats.last_query_at || stats.lastQueryAt,
      };
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Get database schema information
  async getDatabaseSchema(databaseId: string) {
    const endpoint = `GET /api/v1/databases/${databaseId}/schema`;
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/schema`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Upload file to database (alternative method)
  async uploadDatabaseFile(
    databaseId: string,
    file: File,
    onProgress?: (progress: number) => void
  ) {
    const endpoint = `POST /api/v1/databases/${databaseId}/upload`;
    
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
      throw handleApiError(endpoint, error);
    }
  },
};