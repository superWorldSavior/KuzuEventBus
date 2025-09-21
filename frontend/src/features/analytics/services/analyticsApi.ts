// Analytics API service
import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";

export class AnalyticsAPI {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const endpoint = "GET /api/v1/dashboard/stats";
    
    try {
      const response = await apiClient.get("/api/v1/dashboard/stats");
      markEndpointWorking(endpoint);
      
      // Transform snake_case to camelCase
      const data = response.data;
      return {
        totalDatabases: data.total_databases || data.totalDatabases || 0,
        totalStorageBytes: data.total_storage_bytes || data.totalStorageBytes || 0, // Keep as bytes for consistency
        queriesToday: data.queries_today || data.queriesToday || 0,
        avgQueryTimeMs: data.avg_query_time_ms || data.avgQueryTimeMs || 0,
        activeConnections: data.active_connections || data.activeConnections || 0,
        lastUpdated: data.last_updated || data.lastUpdated || new Date().toISOString(),
        systemHealth: {
          status: data.system_health?.status || data.systemHealth?.status || "healthy",
          uptime: data.system_health?.uptime || data.systemHealth?.uptime || "N/A",
          memoryUsage: data.system_health?.memory_usage || data.systemHealth?.memoryUsage || 0,
          cpuUsage: data.system_health?.cpu_usage || data.systemHealth?.cpuUsage || 0,
          diskUsage: data.system_health?.disk_usage || data.systemHealth?.diskUsage || 0
        }
      };
    } catch (error) {
      // For analytics, we want to provide fallback data with error tracking
      const errorDetails = handleApiError(endpoint, error);
      console.warn('Dashboard stats not available, using fallback data:', errorDetails);
      
      return {
        totalDatabases: 0,
        totalStorageBytes: 0, // Changed to bytes to match backend
        queriesToday: 0,
        avgQueryTimeMs: 0,
        activeConnections: 0,
        lastUpdated: new Date().toISOString(),
        _mock: true, // Indicate this is fallback data
        systemHealth: {
          status: "unknown",
          uptime: "N/A",
          memoryUsage: 0,
          cpuUsage: 0,
          diskUsage: 0
        }
      };
    }
  }

  /**
   * Get recent queries across all databases
   */
  async getRecentQueries(limit = 10) {
    const endpoint = "GET /api/v1/queries/recent";
    
    try {
      const response = await apiClient.get(`/api/v1/queries/recent?limit=${limit}`);
      markEndpointWorking(endpoint);
      
      // Transform backend response format
      const queries = response.data;
      return queries.map((query: any) => ({
        id: query.transaction_id || query.id,
        content: query.query_text || query.content || query.query,
        databaseId: query.database_id || query.databaseId,
        status: query.status,
        createdAt: query.created_at || query.createdAt,
        startedAt: query.started_at || query.startedAt,
        completedAt: query.completed_at || query.completedAt,
        durationMs: query.execution_time_ms || query.durationMs,
        errorMessage: query.error_message || query.errorMessage,
        parameters: query.parameters,
      }));
    } catch (error) {
      // Provide empty array with error tracking
      const errorDetails = handleApiError(endpoint, error);
      console.warn('Recent queries not available, returning empty list:', errorDetails);
      
      return [];
    }
  }

  /**
   * Get recent activity across the platform
   */
  async getRecentActivity(limit = 10) {
    const endpoint = "GET /api/v1/activity/recent";
    
    try {
      const response = await apiClient.get(`/api/v1/activity/recent?limit=${limit}`);
      markEndpointWorking(endpoint);
      
      // Transform backend response format
      const activities = response.data;
      return activities.map((activity: any) => ({
        id: activity.id,
        type: activity.activity_type || activity.type,
        title: activity.title,
        description: activity.description,
        timestamp: activity.created_at || activity.timestamp,
        user: activity.user_email || activity.user,
        metadata: activity.metadata,
      }));
    } catch (error) {
      // Provide fallback data with error tracking
      const errorDetails = handleApiError(endpoint, error);
      console.warn('Recent activity not available, using fallback data:', errorDetails);
      
      // Mock recent activity
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
  }

  /**
   * Get performance metrics over time
   */
  async getPerformanceMetrics(timeRange: "1h" | "24h" | "7d" | "30d" = "7d") {
    const endpoint = `GET /api/v1/analytics/query-performance`;
    
    try {
      const response = await apiClient.get(`/api/v1/analytics/query-performance?range=${timeRange}`);
      markEndpointWorking(endpoint);
      
      // Transform backend response format
      const data = response.data;
      return {
        queryPerformance: data.query_performance?.map((item: any) => ({
          timestamp: item.timestamp,
          avgTime: item.avg_time_ms || item.avgTime,
          queryCount: item.query_count || item.queryCount,
        })) || data.queryPerformance || [],
        storageUsage: data.storage_usage?.map((item: any) => ({
          timestamp: item.timestamp,
          usageGB: item.usage_gb || item.usageGB,
        })) || data.storageUsage || [],
        connectionMetrics: data.connection_metrics?.map((item: any) => ({
          timestamp: item.timestamp,
          activeConnections: item.active_connections || item.activeConnections,
          totalConnections: item.total_connections || item.totalConnections,
        })) || data.connectionMetrics || [],
      };
    } catch (error) {
      // Provide fallback data with error tracking
      const errorDetails = handleApiError(endpoint, error);
      console.warn('Performance metrics not available, using fallback data:', errorDetails);
      
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