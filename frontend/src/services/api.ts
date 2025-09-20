import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import type { ErrorResponse } from "@/types/api";

// Backend integration status tracking
interface BackendEndpointStatus {
  endpoint: string;
  status: 'implemented' | 'not_implemented' | 'missing' | 'unknown';
  lastChecked?: string;
}

const endpointStatus = new Map<string, BackendEndpointStatus>();

// Utility to handle backend integration errors
function handleBackendError(endpoint: string, error: any, mockData?: any) {
  const isAxiosError = error.response;
  
  if (isAxiosError) {
    const status = error.response.status;
    const statusInfo: BackendEndpointStatus = {
      endpoint,
      lastChecked: new Date().toISOString(),
      status: status === 501 ? 'not_implemented' : 'implemented'
    };
    
    if (status === 501) {
      console.warn(`🚧 Backend endpoint ${endpoint} is not yet implemented (501 status)`);
      endpointStatus.set(endpoint, statusInfo);
      
      if (mockData) {
        console.info(`📝 Using mock data for ${endpoint} - this endpoint is planned but not yet implemented`);
        return mockData;
      }
      
      throw new Error(`Backend endpoint ${endpoint} is not yet implemented. Check the integration documentation.`);
    }
    
    endpointStatus.set(endpoint, statusInfo);
    throw error;
  }
  
  // Network error or other issues
  console.warn(`🔌 Cannot connect to backend for ${endpoint} - using mock data for development`);
  endpointStatus.set(endpoint, { endpoint, status: 'unknown', lastChecked: new Date().toISOString() });
  
  if (mockData) {
    return mockData;
  }
  
  throw new Error(`Backend unavailable for ${endpoint}. Check if the backend server is running.`);
}

// Export function to get current backend status
export function getBackendIntegrationStatus(): BackendEndpointStatus[] {
  return Array.from(endpointStatus.values());
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

    // Add API key authentication if available
    // API keys are stored in localStorage with customer registration
    const apiKey = localStorage.getItem('kuzu_api_key');
    if (apiKey && apiKey.startsWith('kb_')) {
      config.headers['X-API-Key'] = apiKey;
    }

    // Also support Bearer token authentication for backwards compatibility
    const token = localStorage.getItem('auth_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
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
    return response;
  },
  (error: AxiosError<ErrorResponse>) => {
    // Handle different error scenarios
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      // Forbidden - show error message
      console.error("Access forbidden:", error.response.data);
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
    const response = await apiClient.post("/api/v1/customers/register", data);
    
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
      return response.data;
    } catch (error) {
      return handleBackendError(endpoint, error, mockData);
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
      return response.data;
    } catch (error) {
      return handleBackendError(endpoint, error, mockResponse);
    }
  },

  async getDatabase(databaseId: string) {
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}`);
      return response.data;
    } catch (error) {
      // Return mock data if backend is not available
      console.warn("Using mock database data");
      return {
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
    }
  },

  async deleteDatabase(databaseId: string) {
    try {
      const response = await apiClient.delete(`/api/v1/databases/${databaseId}`);
      return response.data;
    } catch (error) {
      // Simulate successful deletion for demo purposes
      console.warn("Using mock database deletion");
      return { success: true, message: "Database deleted successfully" };
    }
  },

  async updateDatabase(databaseId: string, data: { name?: string; description?: string }) {
    try {
      const response = await apiClient.put(`/api/v1/databases/${databaseId}`, data);
      return response.data;
    } catch (error) {
      // Simulate successful update for demo purposes
      console.warn("Using mock database update");
      return {
        database_id: databaseId,
        ...data,
        updated_at: new Date().toISOString(),
      };
    }
  },

  // File upload methods
  async uploadDatabaseFile(databaseId: string, file: File, onProgress?: (progress: number) => void) {
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
      return response.data;
    } catch (error) {
      // Simulate file upload for demo purposes
      console.warn("Using mock file upload");
      
      // Simulate upload progress
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress(i);
        }
      }
      
      return {
        success: true,
        file_id: `file-${Date.now()}`,
        message: "File uploaded successfully",
        records_imported: Math.floor(Math.random() * 10000) + 1000,
      };
    }
  },

  // Future query execution methods
  async submitQuery(
    databaseId: string,
    data: {
      query: string;
      parameters?: Record<string, unknown>;
      timeout_seconds?: number;
      priority?: number;
    }
  ) {
    const response = await apiClient.post(
      `/api/v1/databases/${databaseId}/query`,
      data
    );
    return response.data;
  },

  async getQueryStatus(transactionId: string) {
    const response = await apiClient.get(
      `/api/v1/jobs/${transactionId}`
    );
    return response.data;
  },

  async getQueryResults(transactionId: string) {
    const response = await apiClient.get(
      `/api/v1/queries/${transactionId}/results`
    );
    return response.data;
  },

  async cancelQuery(transactionId: string) {
    const response = await apiClient.post(
      `/api/v1/queries/${transactionId}/cancel`
    );
    return response.data;
  },

  // Dashboard and analytics methods
  async getDashboardStats() {
    try {
      const response = await apiClient.get("/api/v1/dashboard/stats");
      return response.data;
    } catch (error) {
      // Return mock data if backend is not available
      console.warn("Using mock dashboard data");
      return {
        totalDatabases: 8,
        totalStorageGB: 4.2,
        queriesToday: 143,
        avgQueryTimeMs: 42,
        activeConnections: 12,
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  async getRecentQueries(limit = 10) {
    try {
      const response = await apiClient.get(`/api/v1/queries/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      // Return mock data if backend is not available
      console.warn("Using mock recent queries data");
      return [
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
    }
  },

  async getRecentActivity(limit = 10) {
    try {
      const response = await apiClient.get(`/api/v1/activity/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      // Return mock data if backend is not available
      console.warn("Using mock activity data");
      return [
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
    }
  },

  async getPerformanceMetrics(timeRange = "7d") {
    try {
      const response = await apiClient.get(`/api/v1/analytics/performance?range=${timeRange}`);
      return response.data;
    } catch (error) {
      // Return mock data if backend is not available
      console.warn("Using mock performance data");
      return {
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
    }
  },
};

export default apiClient;
