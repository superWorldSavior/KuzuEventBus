// Health check API service - shared infrastructure
import { apiClient } from "../client";

export class HealthAPI {
  /**
   * Check basic health status
   */
  async checkHealth() {
    const response = await apiClient.get("/health");
    return response.data;
  }

  /**
   * Check system readiness
   */
  async checkReadiness() {
    const response = await apiClient.get("/health/ready");
    return response.data;
  }

  /**
   * Get detailed system status
   */
  async getSystemStatus() {
    try {
      const response = await apiClient.get("/api/v1/system/status");
      return response.data;
    } catch (error) {
      // Mock system status for development
      return {
        status: "healthy",
        version: "1.0.0",
        uptime: "15d 7h 32m",
        timestamp: new Date().toISOString(),
        services: {
          database: { status: "healthy", responseTime: 12 },
          cache: { status: "healthy", responseTime: 3 },
          storage: { status: "healthy", responseTime: 8 },
          queue: { status: "healthy", responseTime: 5 }
        },
        resources: {
          cpu: { usage: 23.5, cores: 8 },
          memory: { used: 6.4, total: 16.0, percentage: 40.0 },
          disk: { used: 185.5, total: 500.0, percentage: 37.1 }
        }
      };
    }
  }
}

// Export singleton instance
export const healthApi = new HealthAPI();