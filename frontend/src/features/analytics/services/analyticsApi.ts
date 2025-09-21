// Analytics API service
import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";

export class AnalyticsAPI {
  /**
   * Get dashboard statistics - MOCK VERSION
   */
  async getDashboardStats() {
    // Mock data - no backend calls
    return {
      node_count: 0,
      relationship_count: 0,
      community_count: 0,
      top_labels: [],
      _mock: true,
    };
  }

  // Dedicated helper if the caller wants to explicitly fetch per-DB stats
  async getDatabaseStats(databaseId?: string) {
    if (!databaseId) {
      console.warn("Database stats require a databaseId. Please select a database first.");
      return { database_id: '', node_count: 0, relationship_count: 0, community_count: 0, top_labels: [] };
    }
    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/stats`);
      markEndpointWorking("GET /api/v1/databases/{database_id}/stats");
      return response.data;
    } catch (error) {
      const errorDetails = handleApiError("GET /api/v1/databases/{database_id}/stats", error);
      console.warn('Database stats failed, returning empty payload:', errorDetails);
      return { database_id: databaseId, node_count: 0, relationship_count: 0, community_count: 0, top_labels: [] };
    }
  }

  /**
   * Get popular queries for a specific database (backend contract)
   */
  async getPopularQueries(databaseId: string | undefined | null, limit = 10) {
    const endpoint = "GET /api/v1/databases/{database_id}/queries/popular";

    if (!databaseId) {
      console.error(
        "Popular queries require a databaseId. The frontend must provide the selected database id to call this endpoint.",
      );
      return [];
    }

    try {
      const response = await apiClient.get(`/api/v1/databases/${databaseId}/queries/popular?limit=${limit}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error: any) {
      // If database not found yet, return empty list; otherwise propagate
      if (error?.response?.status === 404) {
        console.warn(`Popular queries not available for database ${databaseId} (404). Returning empty list.`);
        return [];
      }
      const errorDetails = handleApiError(endpoint, error);
      console.warn('Popular queries failed, returning empty list:', errorDetails);
      return [];
    }
  }

  /**
   * Get recent queries - MOCK VERSION (no backend endpoint)
   */
  async getRecentQueries(limit = 10) {
    // Mock empty data - no backend calls, no errors
    return [];
  }

  /**
   * Get recent activity - MOCK VERSION (no backend endpoint)
   */
  async getRecentActivity(limit = 10) {
    // Mock recent activity - no backend calls
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
        {
          id: "4",
          type: "database_deleted",
          title: "Database deleted",
          description: "Deleted 'test-db' database",
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          user: "alice@example.com",
        },
        {
          id: "5",
          type: "query_failed",
          title: "Query execution failed",
          description: "Syntax error in query for user-analytics database",
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          user: "bob@example.com",
          metadata: { error: "Unexpected token at line 2" },
        }
      ].slice(0, limit);
  }

  /**
   * Get performance metrics over time
   */
  async getPerformanceMetrics(timeRange: "1h" | "24h" | "7d" | "30d" = "7d") {
    try {
      const response = await apiClient.get(`/api/v1/analytics/performance?range=${timeRange}`);
      return response.data;
    } catch (error) {
      // Mock performance metrics
      return {
        queryPerformance: [
          { timestamp: "2024-01-01T00:00:00Z", avgTime: 45, queryCount: 124 },
          { timestamp: "2024-01-02T00:00:00Z", avgTime: 52, queryCount: 143 },
          { timestamp: "2024-01-03T00:00:00Z", avgTime: 38, queryCount: 98 },
          { timestamp: "2024-01-04T00:00:00Z", avgTime: 61, queryCount: 167 },
          { timestamp: "2024-01-05T00:00:00Z", avgTime: 43, queryCount: 132 },
          { timestamp: "2024-01-06T00:00:00Z", avgTime: 55, queryCount: 156 },
          { timestamp: "2024-01-07T00:00:00Z", avgTime: 39, queryCount: 129 },
        ],
        storageUsage: [
          { timestamp: "2024-01-01T00:00:00Z", usageGB: 2.3 },
          { timestamp: "2024-01-02T00:00:00Z", usageGB: 2.8 },
          { timestamp: "2024-01-03T00:00:00Z", usageGB: 3.1 },
          { timestamp: "2024-01-04T00:00:00Z", usageGB: 3.5 },
          { timestamp: "2024-01-05T00:00:00Z", usageGB: 3.9 },
          { timestamp: "2024-01-06T00:00:00Z", usageGB: 4.1 },
          { timestamp: "2024-01-07T00:00:00Z", usageGB: 4.2 },
        ],
        connectionMetrics: [
          { timestamp: "2024-01-01T00:00:00Z", activeConnections: 8, totalConnections: 24 },
          { timestamp: "2024-01-02T00:00:00Z", activeConnections: 12, totalConnections: 31 },
          { timestamp: "2024-01-03T00:00:00Z", activeConnections: 6, totalConnections: 18 },
          { timestamp: "2024-01-04T00:00:00Z", activeConnections: 15, totalConnections: 42 },
          { timestamp: "2024-01-05T00:00:00Z", activeConnections: 11, totalConnections: 28 },
          { timestamp: "2024-01-06T00:00:00Z", activeConnections: 13, totalConnections: 35 },
          { timestamp: "2024-01-07T00:00:00Z", activeConnections: 12, totalConnections: 33 },
        ]
      };
    }
  }

  /**
   * Get system resource usage metrics
   */
  async getResourceMetrics(timeRange: "1h" | "24h" | "7d" | "30d" = "24h") {
    try {
      const response = await apiClient.get(`/api/v1/analytics/resources?range=${timeRange}`);
      return response.data;
    } catch (error) {
      // Mock resource metrics
      return {
        cpu: [
          { timestamp: "2024-01-01T00:00:00Z", usage: 23.5, cores: 8 },
          { timestamp: "2024-01-01T01:00:00Z", usage: 28.2, cores: 8 },
          { timestamp: "2024-01-01T02:00:00Z", usage: 19.8, cores: 8 },
          { timestamp: "2024-01-01T03:00:00Z", usage: 31.4, cores: 8 },
        ],
        memory: [
          { timestamp: "2024-01-01T00:00:00Z", used: 6.4, total: 16, percentage: 40 },
          { timestamp: "2024-01-01T01:00:00Z", used: 7.2, total: 16, percentage: 45 },
          { timestamp: "2024-01-01T02:00:00Z", used: 5.8, total: 16, percentage: 36.25 },
          { timestamp: "2024-01-01T03:00:00Z", used: 8.1, total: 16, percentage: 50.6 },
        ],
        disk: [
          { timestamp: "2024-01-01T00:00:00Z", used: 185.5, total: 500, percentage: 37.1 },
          { timestamp: "2024-01-01T01:00:00Z", used: 186.2, total: 500, percentage: 37.24 },
          { timestamp: "2024-01-01T02:00:00Z", used: 186.8, total: 500, percentage: 37.36 },
          { timestamp: "2024-01-01T03:00:00Z", used: 187.3, total: 500, percentage: 37.46 },
        ],
        network: [
          { timestamp: "2024-01-01T00:00:00Z", inbound: 12.5, outbound: 8.3 },
          { timestamp: "2024-01-01T01:00:00Z", inbound: 15.2, outbound: 11.7 },
          { timestamp: "2024-01-01T02:00:00Z", inbound: 9.8, outbound: 6.2 },
          { timestamp: "2024-01-01T03:00:00Z", inbound: 18.4, outbound: 13.9 },
        ]
      };
    }
  }

  /**
   * Get database usage analytics
   */
  async getDatabaseAnalytics(timeRange: "7d" | "30d" | "90d" = "30d") {
    try {
      const response = await apiClient.get(`/api/v1/analytics/databases?range=${timeRange}`);
      return response.data;
    } catch (error) {
      // Mock database analytics
      return {
        databaseUsage: [
          { name: "social-network", queries: 245, storageGB: 1.8, avgQueryTime: 42 },
          { name: "ecommerce-db", queries: 189, storageGB: 1.2, avgQueryTime: 67 },
          { name: "inventory-system", queries: 156, storageGB: 0.9, avgQueryTime: 38 },
          { name: "user-analytics", queries: 98, storageGB: 0.3, avgQueryTime: 24 },
        ],
        topQueries: [
          { query: "MATCH (n:Person) RETURN count(n)", frequency: 34, avgTime: 15 },
          { query: "MATCH (p:Product) WHERE p.price > 100 RETURN p", frequency: 28, avgTime: 89 },
          { query: "MATCH (u:User)-[:PURCHASED]->(p:Product) RETURN u, p", frequency: 21, avgTime: 125 },
        ],
        errorRates: [
          { timestamp: "2024-01-01", errors: 3, total: 156 },
          { timestamp: "2024-01-02", errors: 7, total: 189 },
          { timestamp: "2024-01-03", errors: 2, total: 134 },
          { timestamp: "2024-01-04", errors: 5, total: 167 },
        ]
      };
    }
  }

  /**
   * Get user activity analytics
   */
  async getUserAnalytics(timeRange: "7d" | "30d" | "90d" = "30d") {
    try {
      const response = await apiClient.get(`/api/v1/analytics/users?range=${timeRange}`);
      return response.data;
    } catch (error) {
      // Mock user analytics
      return {
        activeUsers: 12,
        totalSessions: 156,
        avgSessionDuration: 1847, // seconds
        topUsers: [
          { user: "alice@example.com", queries: 89, databases: 3, lastActive: "2024-01-07T15:30:00Z" },
          { user: "bob@example.com", queries: 67, databases: 2, lastActive: "2024-01-07T14:45:00Z" },
          { user: "carol@example.com", queries: 45, databases: 4, lastActive: "2024-01-07T16:20:00Z" },
        ],
        activityHeatmap: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          activity: Math.floor(Math.random() * 100) + 20
        }))
      };
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    timeRange: "7d" | "30d" | "90d" = "30d",
    sections: string[] = ["overview", "performance", "usage", "errors"]
  ) {
    try {
      const response = await apiClient.post("/api/v1/analytics/report", {
        timeRange,
        sections
      });
      return response.data;
    } catch (error) {
      // Mock analytics report
      return {
        id: `report-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        timeRange,
        sections,
        summary: {
          totalQueries: 1456,
          successRate: 96.2,
          avgResponseTime: 127,
          topDatabase: "social-network",
          peakHour: 14
        },
        insights: [
          {
            type: "performance",
            severity: "info",
            message: "Query performance improved 15% compared to last period",
            recommendation: "Consider caching frequently used queries"
          },
          {
            type: "usage",
            severity: "warning", 
            message: "Storage usage increased 25% this month",
            recommendation: "Review data retention policies"
          },
          {
            type: "errors",
            severity: "low",
            message: "Error rate remains within acceptable limits",
            recommendation: null
          }
        ],
        downloadUrl: `/api/v1/reports/${Date.now()}/download`
      };
    }
  }
}

// Export singleton instance
export const analyticsApi = new AnalyticsAPI();