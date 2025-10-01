// Query execution API service
import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";
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
    const endpoint = `POST /api/v1/databases/${databaseId}/query`;
    
    try {
      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/query`,
        data
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get query execution status
   */
  async getQueryStatus(transactionId: string): Promise<QueryStatus> {
    const endpoint = `GET /api/v1/jobs/${transactionId}`;
    
    try {
      const response = await apiClient.get(
        `/api/v1/jobs/${transactionId}`
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get query results from completed job
   */
  async getQueryResults(transactionId: string): Promise<QueryResult> {
    const endpoint = `GET /api/v1/jobs/${transactionId}/results`;
    
    try {
      const response = await apiClient.get(
        `/api/v1/jobs/${transactionId}/results`
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Cancel a running query
   */
  async cancelQuery(transactionId: string) {
    const endpoint = `POST /api/v1/queries/${transactionId}/cancel`;
    
    try {
      const response = await apiClient.post(
        `/api/v1/queries/${transactionId}/cancel`
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get query history for a database
   */
  async getQueryHistory(databaseId: string, limit = 50): Promise<Query[]> {
    const endpoint = `GET /api/v1/databases/${databaseId}/queries/history`;
    
    try {
      const response = await apiClient.get(
        `/api/v1/databases/${databaseId}/queries/history`,
        { params: { limit } }
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get query execution statistics
   */
  async getQueryStatistics(databaseId: string, timeframe: "1h" | "24h" | "7d" | "30d" = "24h") {
    const endpoint = `GET /api/v1/databases/${databaseId}/queries/statistics`;
    
    try {
      const response = await apiClient.get(
        `/api/v1/databases/${databaseId}/queries/statistics`,
        { params: { timeframe } }
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Validate query syntax
   */
  async validateQuery(query: string, databaseId?: string) {
    const endpoint = 'POST /api/v1/queries/validate';
    
    try {
      const response = await apiClient.post(
        `/api/v1/queries/validate`,
        { query, database_id: databaseId }
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get query execution plan
   */
  async getQueryPlan(query: string, databaseId: string) {
    const endpoint = `POST /api/v1/databases/${databaseId}/queries/plan`;
    
    try {
      const response = await apiClient.post(
        `/api/v1/databases/${databaseId}/queries/plan`,
        { query }
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
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
    const endpoint = 'POST /api/v1/queries/templates';
    
    try {
      const response = await apiClient.post(
        `/api/v1/queries/templates`,
        data
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }

  /**
   * Get saved query templates
   */
  async getQueryTemplates(databaseId?: string) {
    const endpoint = 'GET /api/v1/queries/templates';
    
    try {
      const response = await apiClient.get(
        `/api/v1/queries/templates`,
        { params: databaseId ? { database_id: databaseId } : {} }
      );
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  }
}

// Export singleton instance
export const queryApi = new QueryExecutionAPI();