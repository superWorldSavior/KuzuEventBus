/**
 * Kuzu Event Bus - TypeScript SDK
 * Simple HTTP client for interacting with the API
 */

export interface KuzuClientConfig {
  baseUrl: string;
  apiKey: string;
}

// ==================== Database DTOs ====================
export interface Database {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
  size_bytes: number;
  tenant_id: string;
}

export interface DatabaseListResponse {
  tenant: string;
  databases: Database[];
  total_count: number;
  total_size_bytes: number;
}

// ==================== Query DTOs ====================
export interface QueryRequest {
  query: string;
  parameters?: Record<string, unknown>;
  timeoutSeconds?: number; // maps to backend timeout_seconds (optional)
}

export interface QuerySubmitResponse {
  transaction_id: string;
  status: string;
  submitted_at: string;
  estimated_completion: string;
}

export interface QueryStatusResponse {
  transaction_id: string;
  database_id: string;
  status: string;
  query: string;
  submitted_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  execution_time_ms?: number | null;
  result_count?: number | null;
  error_message?: string | null;
}

export interface QueryResultsResponse {
  transaction_id: string;
  status: string;
  results: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  execution_stats: Record<string, unknown>;
  retrieved_at: string;
}

export interface Snapshot {
  id: string;
  object_key: string;
  checksum: string;
  size_bytes: number;
  created_at: string;
}

export interface SnapshotListResponse {
  database_id: string;
  snapshots: Snapshot[];
  count: number;
}
export interface RestoreResponse {
  restored: boolean;
  database_id: string;
  mode: string;
  restored_at: string;
}

export interface SseTokenResponse {
  token: string;
  expires_in: number;
}

// Backward-compat alias
export type QueryJob = QuerySubmitResponse;

/**
 * Main client for interacting with Kuzu Event Bus API
 *
 * Provides type-safe methods for database management, query execution,
 * snapshots, and real-time event streaming.
 */
export class KuzuEventBusClient {
  private config: KuzuClientConfig;

  constructor(config: KuzuClientConfig) {
    this.config = config;
  }
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`API Error: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  // ==================== Databases ====================

  /**
   * List all databases for the authenticated tenant
   * Maps the API response wrapper to an array of databases.
   */
  async listDatabases(): Promise<Database[]> {
    const res = await this.request<DatabaseListResponse>('/api/v1/databases/');
    return res.databases;
  }

  /**
   * Create a new Kuzu database
   * 
   * @param name - Database name (alphanumeric, hyphens allowed)
   * @returns The created database metadata
   * @throws {Error} If name is invalid or already exists
   * 
   * @example
   * ```typescript
   * const db = await client.createDatabase('my-graph');
   * console.log('Database ID:', db.id);
   * ```
   */
  async createDatabase(name: string): Promise<Database> {
    return this.request<Database>('/api/v1/databases/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Get detailed information about a specific database
   * 
   * @param databaseId - The database ID
   * @returns Database metadata including creation date
   * @throws {Error} If database not found or unauthorized
   * 
   * @example
   * ```typescript
   * const db = await client.getDatabase('db-123');
   * console.log('Created at:', db.created_at);
   * ```
   */
  async getDatabase(databaseId: string): Promise<Database> {
    return this.request<Database>(`/api/v1/databases/${databaseId}`);
  }

  /**
   * Permanently delete a database and all its data
   * 
   * @param databaseId - The database ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} If database not found or deletion fails
   * 
   * @example
   * ```typescript
   * await client.deleteDatabase('db-123');
   * console.log('Database deleted');
   * ```
   */
  async deleteDatabase(databaseId: string): Promise<void> {
    await this.request<void>(`/api/v1/databases/${databaseId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Queries ====================

  /** Submit a Cypher query for async execution (queued job). */
  async submitQuery(
    databaseId: string,
    request: QueryRequest
  ): Promise<QuerySubmitResponse> {
    // Map SDK naming to backend (timeout_seconds)
    const body = {
      query: request.query,
      parameters: request.parameters,
      timeout_seconds: request.timeoutSeconds,
    };
    return this.request<QuerySubmitResponse>(
      `/api/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }

  /** Get status of a submitted query job. */
  async getQueryStatus(transactionId: string): Promise<QueryStatusResponse> {
    return this.request<QueryStatusResponse>(`/api/v1/jobs/${transactionId}`);
  }

  /** Fetch final results of a completed job. */
  async getJobResults(transactionId: string): Promise<QueryResultsResponse> {
    return this.request<QueryResultsResponse>(`/api/v1/jobs/${transactionId}/results`);
  }

  /** Execute a query: submit, poll status, then fetch results when completed. */
  async executeQuery(
    databaseId: string,
    query: string,
    options: {
      parameters?: Record<string, unknown>;
      pollInterval?: number;
      timeout?: number; // total client-side timeout in ms
      submitTimeoutSeconds?: number; // backend timeout_seconds override
    } = {}
  ): Promise<QueryResultsResponse> {
    const { parameters, pollInterval = 1000, timeout = 30000, submitTimeoutSeconds } = options;

    // Submit job
    const job = await this.submitQuery(databaseId, { query, parameters, timeoutSeconds: submitTimeoutSeconds });

    // Poll status
    const startTime = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const status = await this.getQueryStatus(job.transaction_id);
      if (status.status === 'completed') {
        // Fetch final results
        return this.getJobResults(job.transaction_id);
      }
      if (status.status === 'failed') {
        throw new Error(status.error_message || 'Query failed');
      }
      if (Date.now() - startTime > timeout) {
        throw new Error('Query timeout exceeded');
      }
      await this.sleep(pollInterval);
    }
  }

  /** Create a snapshot. */
  async createSnapshot(databaseId: string): Promise<Snapshot> {
    return this.request<Snapshot>(
      `/api/v1/databases/${databaseId}/snapshots`,
      { method: 'POST' }
    );
  }

  /**
   * List all available snapshots for a database
   * 
   * @param databaseId - Database ID
   * @returns Array of snapshot metadata (ID, creation date, size)
   * @throws {Error} If database not found
   * 
   * @example
   * ```typescript
   * const snapshots = await client.listSnapshots('db-123');
   * snapshots.forEach(s => {
   *   console.log('Snapshot:', s.snapshot_id, 'created at', s.created_at);
   * });
   * ```
   */
  /** List snapshots (maps wrapper to array). */
  async listSnapshots(databaseId: string): Promise<Snapshot[]> {
    const res = await this.request<SnapshotListResponse>(
      `/api/v1/databases/${databaseId}/snapshots`
    );
    return res.snapshots;
  }

  /**
   * Restore a database to a previous snapshot state
   * 
   * **WARNING**: This overwrites current database content!
   * 
   * @param databaseId - Database to restore
   * @param snapshotId - Snapshot ID to restore from
   * @returns Promise that resolves when restoration completes
   * @throws {Error} If snapshot not found or restoration fails
   * 
   * @example
   * ```typescript
   * // Restore to previous state
   * await client.restoreSnapshot('db-123', 'snap-abc456');
   * console.log('Database restored successfully');
   * ```
   */
  async restoreSnapshot(
    databaseId: string,
    snapshotId: string
  ): Promise<RestoreResponse> {
    return this.request<RestoreResponse>(`/api/v1/databases/${databaseId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ snapshot_id: snapshotId }),
    });
  }

  // ==================== Server-Sent Events ====================

  /** Generate a short-lived JWT for SSE. */
  async getSseToken(): Promise<SseTokenResponse> {
    return this.request<SseTokenResponse>('/api/v1/auth/sse-token', {
      method: 'POST',
    });
  }

  /**
   * Connect to Server-Sent Events stream for real-time notifications
   * 
   * Automatically handles SSE token generation. Receives events like:
   * - `query.completed` - Query finished successfully
   * - `query.failed` - Query execution failed
   * - `database.created` - New database created
   * 
   * @param onEvent - Callback for incoming events
   * @param onError - Optional error handler
   * @returns EventSource instance (call `.close()` to disconnect)
   * @throws {Error} If SSE token generation fails
   * 
   * @example
   * ```typescript
   * const stream = await client.connectEventStream(
   *   (event) => {
   *     const data = JSON.parse(event.data);
   *     
   *     if (data.event_type === 'query.completed') {
   *       console.log('Query done:', data.transaction_id);
   *     }
   *   },
   *   (error) => {
   *     console.error('Stream error:', error);
   *   }
   * );
   * 
   * // Later: close connection
   * stream.close();
   * ```
   */
  async connectEventStream(
    onEvent: (event: MessageEvent) => void,
    onError?: (error: Event) => void
  ): Promise<EventSource> {
    const { token } = await this.getSseToken();
    const eventSource = new EventSource(
      `${this.config.baseUrl}/api/v1/events/stream?token=${token}`
    );

    eventSource.onmessage = onEvent;
    if (onError) {
      eventSource.onerror = onError;
    }

    return eventSource;
  }

  // ==================== Helpers ====================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a Kuzu Event Bus client
 * 
 * @param config - Client configuration
 * @param config.baseUrl - API base URL (e.g., 'http://localhost:8200')
 * @param config.apiKey - API key with 'kb_' prefix
 * @returns Configured client instance
 * 
 * @example
 * ```typescript
 * const client = createKuzuClient({
 *   baseUrl: process.env.KUZU_API_URL,
 *   apiKey: process.env.KUZU_API_KEY
 * });
 * ```
 */
export function createKuzuClient(config: KuzuClientConfig): KuzuEventBusClient {
  return new KuzuEventBusClient(config);
}
