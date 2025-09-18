import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import type { ErrorResponse } from "@/types/api";

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
    return response.data;
  },

  // Future database management methods
  async getDatabases() {
    const response = await apiClient.get("/api/v1/databases");
    return response.data;
  },

  async createDatabase(data: { name: string; description?: string }) {
    const response = await apiClient.post("/api/v1/databases", data);
    return response.data;
  },

  async getDatabase(databaseId: string) {
    const response = await apiClient.get(`/api/v1/databases/${databaseId}`);
    return response.data;
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
      `/api/v1/queries/${transactionId}/status`
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
