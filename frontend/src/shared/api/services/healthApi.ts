// Health check API service - shared infrastructure
import { apiClient } from "../client";
import { handleApiError, markEndpointWorking } from "../../lib/errorHandling";

export class HealthAPI {
  /**
   * Check basic health status
   */
  async checkHealth() {
    const endpoint = "GET /health";
    
    try {
      const response = await apiClient.get("/health");
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Check system readiness
   */
  async checkReadiness() {
    const endpoint = "GET /health/ready";
    
    try {
      const response = await apiClient.get("/health/ready");
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get detailed system status
   */
  async getSystemStatus() {
    const endpoint = "GET /api/v1/system/status";
    
    try {
      const response = await apiClient.get("/api/v1/system/status");
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      // For this specific method, provide fallback data with error tracking
      const errorDetails = handleApiError(endpoint, error);
      
      // Return mock data for development but still track the error
      console.warn('System status not available, using mock data:', errorDetails);
      
      return {
        status: "partial" as const, // Indicate not all data is real
        version: "1.0.0-dev",
        uptime: "N/A (mock data)",
        timestamp: new Date().toISOString(),
        _mock: true, // Indicate this is mock data
        services: {
          database: { status: "unknown", responseTime: 0 },
          cache: { status: "unknown", responseTime: 0 },
          storage: { status: "unknown", responseTime: 0 },
          queue: { status: "unknown", responseTime: 0 }
        },
        resources: {
          cpu: { usage: 0, cores: 0 },
          memory: { used: 0, total: 0, percentage: 0 },
          disk: { used: 0, total: 0, percentage: 0 }
        }
      };
    }
  }
}

// Export singleton instance
export const healthApi = new HealthAPI();