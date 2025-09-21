import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import type { ErrorResponse } from "../types/api";
import { 
  handleApiError, 
  markEndpointWorking, 
  getBackendIntegrationStatus as getStatus,
  type BackendEndpointStatus 
} from "@/shared/lib/errorHandling";

// Re-export for backwards compatibility
export function getBackendIntegrationStatus(): BackendEndpointStatus[] {
  return getStatus();
}

// Create axios instance with base configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now(),
    };

    // Primary authentication: API key (KB_ prefix) via Authorization: Bearer
    const apiKey = localStorage.getItem('kuzu_api_key');
    if (apiKey) {
      // Validate API key format
      if (apiKey.startsWith('kb_') && apiKey.length > 10) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      } else {
        // Invalid API key format - clear it
        console.warn("Invalid API key format detected, clearing stored credentials");
        localStorage.removeItem('kuzu_api_key');
        localStorage.removeItem('kuzu_customer_id');
        localStorage.removeItem('kuzu_tenant_name');
        
        // For protected routes, this will trigger 401 and redirect to login
        if (!config.url?.includes('/register') && !config.url?.includes('/health')) {
          console.warn("API request without valid authentication");
        }
      }
    } else {
      // Legacy Bearer token support (for backward compatibility only)
      const token = localStorage.getItem('auth_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add tenant context if available (helpful for multi-tenant debugging)
    const tenantName = localStorage.getItem('kuzu_tenant_name');
    if (tenantName) {
      config.headers['X-Tenant-Context'] = tenantName;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Mark endpoint as working on successful response
    markEndpointWorking(response.config.method?.toUpperCase() + " " + response.config.url);
    return response;
  },
  (error: AxiosError<ErrorResponse>) => {
    // Handle authentication errors properly
    if (error.response?.status === 401) {
      // Clear any stored authentication data
      localStorage.removeItem('kuzu_api_key');
      localStorage.removeItem('kuzu_customer_id');
      localStorage.removeItem('kuzu_tenant_name');
      localStorage.removeItem('auth_token');
      
      // Only redirect if not already on auth pages to prevent loops
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        console.warn("Authentication failed - redirecting to login");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      // Forbidden - show error message but don't redirect
      console.error("Access forbidden:", error.response.data);
      // Let the UI handle the 403 error appropriately
    }

    if (error.response?.status && error.response.status >= 500) {
      // Server error - show generic error message
      console.error("Server error:", error.response?.data);
    }

    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Authentication utilities
  setApiKey(apiKey: string) {
    localStorage.setItem('kuzu_api_key', apiKey);
  },

  getApiKey(): string | null {
    return localStorage.getItem('kuzu_api_key');
  },

  clearApiKey() {
    localStorage.removeItem('kuzu_api_key');
    localStorage.removeItem('kuzu_customer_id');
    localStorage.removeItem('kuzu_tenant_name');
  },

  // Health checks
  async checkHealth() {
    const response = await apiClient.get("/health/");
    return response.data;
  },

  async checkReadiness() {
    const response = await apiClient.get("/health/ready");
    return response.data;
  },

  // Customer management
  async registerCustomer(data: {
    tenant_name: string;
    organization_name: string;
    admin_email: string;
  }) {
    const response = await apiClient.post("/api/v1/auth/register", data);
    
    // Store API key for future requests
    if (response.data?.api_key) {
      localStorage.setItem('kuzu_api_key', response.data.api_key);
      localStorage.setItem('kuzu_customer_id', response.data.customer_id);
      localStorage.setItem('kuzu_tenant_name', response.data.tenant_name);
    }
    
    return response.data;
  },

  // Database management methods
  async getDatabases() {
    const endpoint = "GET /api/v1/databases";
    const mockData = [
      {
        database_id: "db-1",
        name: "social-network",
        description: "Social media relationship data",
        created_at: "2024-01-15T10:30:00Z",
        size_bytes: 1073741824, // 1GB
        table_count: 5,
        last_accessed: "2024-01-20T14:22:00Z",
      },
      {
        database_id: "db-2", 
        name: "ecommerce-db",
        description: "E-commerce product and order data",
        created_at: "2024-01-10T09:15:00Z",
        size_bytes: 2147483648, // 2GB
        table_count: 8,
        last_accessed: "2024-01-19T16:45:00Z",
      },
      {
        database_id: "db-3",
        name: "inventory-system",
        description: "Warehouse inventory management",
        created_at: "2024-01-18T13:20:00Z",
        size_bytes: 536870912, // 512MB
        table_count: 3,
        last_accessed: "2024-01-20T11:30:00Z",
      },
      {
        database_id: "db-4",
        name: "financial-network",
        description: "Financial transaction network analysis",
        created_at: "2024-01-12T11:45:00Z",
        size_bytes: 3221225472, // 3GB
        table_count: 12,
        last_accessed: "2024-01-18T09:22:00Z",
      },
    ];
    
    try {
      const response = await apiClient.get("/api/v1/databases");
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  async createDatabase(data: { name: string; description?: string }) {
    const endpoint = "POST /api/v1/databases";
    const mockResponse = {
      database_id: `db-${Date.now()}`,
      name: data.name,
      description: data.description,
      created_at: new Date().toISOString(),
      size_bytes: 0,
      table_count: 0,
    };
    
    try {
      const response = await apiClient.post("/api/v1/databases", data);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockResponse);
    }
  },

  async getDatabase(databaseId: string) {
    const endpoint = `GET /api/v1/databases/${databaseId}`;
    const mockData = {
      database_id: databaseId,
      name: "social-network",
      description: "Social media relationship data",
      tenant_id: "tenant-123",
      created_at: "2024-01-15T10:30:00Z",
      size_bytes: 1073741824,
      table_count: 5,
      last_accessed: "2024-01-20T14:22:00Z",
      schema: {
        nodes: [
          {
            label: "Person",
            properties: [
              { name: "id", type: "string", required: true },
              { name: "name", type: "string", required: true },
              { name: "age", type: "int64", required: false },
              { name: "email", type: "string", required: false },
            ],
            count: 1250,
          },
          {
            label: "Post",
            properties: [
              { name: "id", type: "string", required: true },
              { name: "content", type: "string", required: true },
              { name: "timestamp", type: "timestamp", required: true },
            ],
            count: 3421,
          },
        ],
        relationships: [
          {
            type: "FOLLOWS",
            from: "Person",
            to: "Person",
            properties: [
              { name: "since", type: "timestamp", required: true },
            ],
            count: 4532,
          },
          {
            type: "POSTED",
            from: "Person", 
            to: "Post",
            properties: [],
            count: 3421,
          },
        ],
      },
    };
    
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  async deleteDatabase(databaseId: string) {
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

  async updateDatabase(databaseId: string, data: { name?: string; description?: string }) {
    const endpoint = `PUT /api/v1/databases/${databaseId}`;
    const mockData = {
      database_id: databaseId,
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    try {
      const response = await apiClient.put(`/api/v1/databases/${databaseId}`, data);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // File upload methods
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
      return response.data;
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
  },  // Query execution methods
  async submitQuery(
    databaseId: string,
    data: {
      query: string;
      parameters?: Record<string, unknown>;
      timeout_seconds?: number;
      priority?: number;
    }
  ) {
    const endpoint = `POST /api/v1/databases/${databaseId}/query`;
    
    try {
      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/query`,
        data
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      // Don't provide mock data for query submission - it needs to work properly
      throw error;
    }
  },

  async getQueryStatus(transactionId: string) {
    const endpoint = `GET /api/v1/jobs/${transactionId}`;
    
    try {
      const response = await apiClient.get(
        `/api/v1/jobs/${transactionId}`
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      // Don't provide mock data for query status - it needs to work properly
      throw error;
    }
  },

  async getQueryResults(transactionId: string) {
    const endpoint = `GET /api/v1/queries/${transactionId}/results`;
    const mockData = {
      transaction_id: transactionId,
      status: "completed",
      results: [
        { "n.name": "Alice", "n.age": 30 },
        { "n.name": "Bob", "n.age": 25 },
        { "n.name": "Charlie", "n.age": 35 },
      ],
      execution_time_ms: 150,
      total_rows: 3,
    };
    
    try {
      const response = await apiClient.get(
        `/api/v1/queries/${transactionId}/results`
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  async cancelQuery(transactionId: string) {
    const endpoint = `POST /api/v1/queries/${transactionId}/cancel`;
    const mockData = {
      transaction_id: transactionId,
      status: "cancelled",
      message: "Query cancelled successfully"
    };
    
    try {
      const response = await apiClient.post(
        `/api/v1/queries/${transactionId}/cancel`
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  // Dashboard and analytics methods
  async getDashboardStats() {
    const endpoint = "GET /api/v1/dashboard/stats";
    const mockData = {
      totalDatabases: 8,
      totalStorageGB: 4.2,
      queriesToday: 143,
      avgQueryTimeMs: 42,
      activeConnections: 12,
      lastUpdated: new Date().toISOString(),
    };
    
    try {
      const response = await apiClient.get("/api/v1/dashboard/stats");
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  async getRecentQueries(limit = 10) {
    const endpoint = `GET /api/v1/queries/recent?limit=${limit}`;
    const mockData = [
      {
        id: "1",
        database: "social-network",
        query: "MATCH (n:Person) RETURN count(n) as person_count",
        status: "completed",
        executionTime: 45,
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        resultCount: 1,
      },
      {
        id: "2", 
        database: "ecommerce-db",
        query: "MATCH (p:Product)-[:BELONGS_TO]->(c:Category) RETURN c.name, count(p) as product_count",
        status: "completed",
        executionTime: 89,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        resultCount: 12,
      },
      {
        id: "3",
        database: "inventory-system", 
        query: "MATCH (i:Item) WHERE i.stock < 10 RETURN i",
        status: "running",
        executionTime: null,
        timestamp: new Date(Date.now() - 1000 * 30).toISOString(),
        resultCount: null,
      },
    ];
    
    try {
      const response = await apiClient.get(`/api/v1/queries/recent?limit=${limit}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  async getRecentActivity(limit = 10) {
    const endpoint = `GET /api/v1/activity/recent?limit=${limit}`;
    const mockData = [
      {
        id: "1",
        type: "query_executed",
        title: "Query executed successfully",
        description: "Retrieved 8 nodes from social-network database",
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        user: "alice@example.com",
        metadata: { query_time: "45ms", result_count: 8 },
      },
      {
        id: "2",
        type: "database_created",
        title: "New database created",
        description: "Created 'inventory-system' database",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        user: "bob@example.com",
      },
      {
        id: "3",
        type: "file_uploaded",
        title: "File uploaded",
        description: "Uploaded 'products.csv' to ecommerce-db",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: "carol@example.com",
        metadata: { file_size: "2.4MB", records: 1250 },
      },
    ];
    
    try {
      const response = await apiClient.get(`/api/v1/activity/recent?limit=${limit}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },

  async getPerformanceMetrics(timeRange = "7d") {
    const endpoint = `GET /api/v1/analytics/performance?range=${timeRange}`;
    const mockData = {
      queryPerformance: [
        { timestamp: "2024-01-01T00:00:00Z", avgTime: 45, queryCount: 124 },
        { timestamp: "2024-01-02T00:00:00Z", avgTime: 52, queryCount: 143 },
        { timestamp: "2024-01-03T00:00:00Z", avgTime: 38, queryCount: 98 },
        { timestamp: "2024-01-04T00:00:00Z", avgTime: 61, queryCount: 167 },
        { timestamp: "2024-01-05T00:00:00Z", avgTime: 43, queryCount: 132 },
      ],
      storageUsage: [
        { timestamp: "2024-01-01T00:00:00Z", usageGB: 2.3 },
        { timestamp: "2024-01-02T00:00:00Z", usageGB: 2.8 },
        { timestamp: "2024-01-03T00:00:00Z", usageGB: 3.1 },
        { timestamp: "2024-01-04T00:00:00Z", usageGB: 3.5 },
        { timestamp: "2024-01-05T00:00:00Z", usageGB: 3.9 },
      ],
    };
    
    try {
      const response = await apiClient.get(`/api/v1/analytics/performance?range=${timeRange}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      return handleApiError(endpoint, error, mockData);
    }
  },
};

export default apiClient;
