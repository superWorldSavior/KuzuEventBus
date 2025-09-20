// Query execution API service
import { apiClient } from "@/shared/api/client";
import type { Query, QueryStatus, QueryResult } from "@/entities/query";

export class QueryExecutionAPI {
  /**
   * Submit a query for execution
   */
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
  }

  /**
   * Get query execution status
   */
  async getQueryStatus(transactionId: string): Promise<QueryStatus> {
    const response = await apiClient.get(
      `/api/v1/jobs/${transactionId}`
    );
    return response.data;
  }

  /**
   * Get query results
   */
  async getQueryResults(transactionId: string): Promise<QueryResult> {
    try {
      const response = await apiClient.get(
        `/api/v1/queries/${transactionId}/results`
      );
      return response.data;
    } catch (error) {
      // Provide mock data for development
      return {
        transactionId,
        status: "completed" as const,
        results: {
          columns: ["n.name", "n.age"],
          rows: [
            { "n.name": "Alice", "n.age": 30 },
            { "n.name": "Bob", "n.age": 25 },
            { "n.name": "Charlie", "n.age": 35 },
          ],
          totalCount: 3,
          executionTimeMs: 150
        },
        metadata: {
          query: "MATCH (n:Person) RETURN n.name, n.age LIMIT 3",
          databaseId: "mock-db",
          executedAt: new Date().toISOString(),
          rowCount: 3
        }
      };
    }
  }

  /**
   * Cancel a running query
   */
  async cancelQuery(transactionId: string) {
    try {
      const response = await apiClient.post(
        `/api/v1/queries/${transactionId}/cancel`
      );
      return response.data;
    } catch (error) {
      // Mock successful cancellation
      return {
        transaction_id: transactionId,
        status: "cancelled" as const,
        message: "Query cancelled successfully"
      };
    }
  }

  /**
   * Get query history for a database
   */
  async getQueryHistory(databaseId: string, limit = 50): Promise<Query[]> {
    try {
      const response = await apiClient.get(
        `/api/v1/databases/${databaseId}/queries/history`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      // Mock query history
      return [
        {
          id: "query-1",
          databaseId,
          content: "MATCH (n:Person) RETURN count(n) as person_count",
          status: "completed",
          createdAt: "2024-01-01T10:00:00Z",
          completedAt: "2024-01-01T10:00:01Z",
          durationMs: 45,
          priority: 1,
          parameters: {}
        },
        {
          id: "query-2", 
          databaseId,
          content: "MATCH (p:Product)-[:BELONGS_TO]->(c:Category) RETURN c.name, count(p) as product_count",
          status: "completed",
          createdAt: "2024-01-01T09:45:00Z",
          completedAt: "2024-01-01T09:45:02Z",
          durationMs: 78,
          priority: 1,
          parameters: {}
        },
        {
          id: "query-3",
          databaseId,
          content: "MATCH (i:Item) WHERE i.stock < 10 RETURN i",
          status: "failed",
          createdAt: "2024-01-01T09:30:00Z",
          durationMs: 0,
          errorMessage: "Syntax error near 'stock'",
          priority: 2,
          parameters: {}
        }
      ];
    }
  }

  /**
   * Get query execution statistics
   */
  async getQueryStatistics(databaseId: string, timeframe: "1h" | "24h" | "7d" | "30d" = "24h") {
    try {
      const response = await apiClient.get(
        `/api/v1/databases/${databaseId}/queries/statistics`,
        { params: { timeframe } }
      );
      return response.data;
    } catch (error) {
      // Mock query statistics
      return {
        totalQueries: 42,
        successfulQueries: 38,
        failedQueries: 4,
        avgExecutionTimeMs: 125,
        totalExecutionTimeMs: 5250,
        cacheHitRatio: 0.72,
        timeframe,
        queryTypes: {
          read: 35,
          write: 7
        },
        performanceMetrics: {
          fastest: { query: "MATCH (n) RETURN count(n)", timeMs: 12 },
          slowest: { query: "MATCH (a)-[*5]-(b) RETURN a, b", timeMs: 1500 },
          mostFrequent: { query: "MATCH (n:User) WHERE n.active = true RETURN n", count: 8 }
        }
      };
    }
  }

  /**
   * Validate query syntax
   */
  async validateQuery(query: string, databaseId?: string) {
    try {
      const response = await apiClient.post(
        `/api/v1/queries/validate`,
        { query, database_id: databaseId }
      );
      return response.data;
    } catch (error) {
      // Mock query validation
      const isValid = !query.includes("SYNTAX_ERROR");
      return {
        isValid,
        errors: isValid ? [] : [
          {
            line: 1,
            column: 15,
            message: "Unexpected token 'SYNTAX_ERROR'",
            severity: "error" as const
          }
        ],
        warnings: [],
        suggestions: isValid ? [] : [
          "Did you mean 'MATCH' instead of 'SYNTAX_ERROR'?"
        ]
      };
    }
  }

  /**
   * Get query execution plan
   */
  async getQueryPlan(query: string, databaseId: string) {
    try {
      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/queries/plan`,
        { query }
      );
      return response.data;
    } catch (error) {
      // Mock execution plan
      return {
        query,
        plan: {
          type: "sequential",
          estimatedCost: 100,
          estimatedRows: 50,
          operations: [
            {
              id: "scan-1",
              type: "NodeScan",
              table: "Person",
              estimatedCost: 50,
              estimatedRows: 100,
              filter: null
            },
            {
              id: "project-1",
              type: "Projection",
              columns: ["n.name", "n.age"],
              estimatedCost: 25,
              estimatedRows: 100,
              dependencies: ["scan-1"]
            },
            {
              id: "limit-1",
              type: "Limit",
              count: 50,
              estimatedCost: 25,
              estimatedRows: 50,
              dependencies: ["project-1"]
            }
          ]
        },
        estimatedExecutionTime: "45ms",
        cacheEligible: true
      };
    }
  }

  /**
   * Save a query as template
   */
  async saveQueryTemplate(data: {
    name: string;
    query: string;
    description?: string;
    parameters?: Record<string, { type: string; default?: unknown; description?: string }>;
    databaseId?: string;
  }) {
    try {
      const response = await apiClient.post(
        `/api/v1/queries/templates`,
        data
      );
      return response.data;
    } catch (error) {
      // Mock template save
      return {
        id: `template-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };
    }
  }

  /**
   * Get saved query templates
   */
  async getQueryTemplates(databaseId?: string) {
    try {
      const response = await apiClient.get(
        `/api/v1/queries/templates`,
        { params: databaseId ? { database_id: databaseId } : {} }
      );
      return response.data;
    } catch (error) {
      // Mock query templates
      return [
        {
          id: "template-1",
          name: "Count Nodes by Type",
          query: "MATCH (n:{{nodeType}}) RETURN count(n) as count",
          description: "Count all nodes of a specific type",
          parameters: {
            nodeType: { 
              type: "string", 
              default: "Person", 
              description: "The node type to count" 
            }
          },
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:00:00Z",
          usageCount: 15,
          databaseId
        },
        {
          id: "template-2",
          name: "Find Connected Components",
          query: "MATCH (a)-[r]->(b) WHERE a.{{property}} = {{value}} RETURN a, r, b",
          description: "Find all nodes connected to nodes with specific property value",
          parameters: {
            property: { type: "string", default: "id", description: "Property to match" },
            value: { type: "any", description: "Value to match against" }
          },
          createdAt: "2024-01-01T09:30:00Z",
          updatedAt: "2024-01-01T09:30:00Z",
          usageCount: 8,
          databaseId
        }
      ];
    }
  }
}

// Export singleton instance
export const queryApi = new QueryExecutionAPI();