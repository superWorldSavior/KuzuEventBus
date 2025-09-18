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

    if (error.response?.status >= 500) {
      // Server error - show generic error message
      console.error("Server error:", error.response.data);
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
};

export default apiClient;
