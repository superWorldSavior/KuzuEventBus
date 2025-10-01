/**
 * Kuzu Event Bus - TypeScript SDK
 * Simple HTTP client for interacting with the API
 */

export interface KuzuClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface Database {
  id: string;
  name: string;
  tenant_id: string;
  created_at: string;
}

export interface QueryRequest {
  query: string;
  parameters?: Record<string, unknown>;
}

export interface QueryJob {
  transaction_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  database_id: string;
}

export interface QueryResult {
  transaction_id: string;
  status: string;
  result?: {
    columns: string[];
    rows: unknown[][];
  };
  error?: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * Main client for interacting with Kuzu Event Bus API
 * 
 * Provides type-safe methods for database management, query execution,
 * snapshots, and real-time event streaming.
 * 
 * @example
 * ```typescript
 * import { createKuzuClient } from '@kuzu-eventbus/sdk';
 * 
 * const client = createKuzuClient({
 *   baseUrl: 'http://localhost:8200',
 *   apiKey: 'kb_YOUR_API_KEY'
 * });
 * 
 * // Create database and query
 * const db = await client.createDatabase('my-graph');
 * const result = await client.executeQuery(db.id, 'MATCH (n) RETURN n LIMIT 10');
 * ```
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
   * 
   * @returns Array of databases owned by the authenticated tenant
   * @throws {Error} If authentication fails or API is unavailable
   * 
   * @example
   * ```typescript
   * const databases = await client.listDatabases();
   * console.log('Found', databases.length, 'databases');
   * ```
   */
  async listDatabases(): Promise<Database[]> {
    return this.request<Database[]>('/api/v1/databases/');
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

  /**
   * Submit a Cypher query for async execution
   * 
   * Returns immediately with a transaction ID. Use `getQueryStatus()` to poll for results.
   * 
   * @param databaseId - Target database ID
   * @param request - Query with optional parameters
   * @returns Job metadata with transaction ID for polling
   * @throws {Error} If query syntax is invalid or database not found
   * 
   * @example
   * ```typescript
   * const job = await client.submitQuery('db-123', {
   *   query: 'MATCH (n:User WHERE n.age > $minAge) RETURN n',
   *   parameters: { minAge: 18 }
   * });
   * console.log('Job ID:', job.transaction_id);
   * ```
   */
  async submitQuery(
    databaseId: string,
    request: QueryRequest
  ): Promise<QueryJob> {
    return this.request<QueryJob>(
      `/api/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Check status and retrieve results of a submitted query
   * 
   * @param transactionId - Transaction ID from `submitQuery()`
   * @returns Query status and results (if completed)
   * @throws {Error} If transaction not found
   * 
   * @example
   * ```typescript
   * const status = await client.getQueryStatus('tx-abc123');
   * 
   * if (status.status === 'completed') {
   *   console.log('Columns:', status.result.columns);
   *   console.log('Rows:', status.result.rows);
   * } else if (status.status === 'failed') {
   *   console.error('Error:', status.error);
   * }
   * ```
   */
  async getQueryStatus(transactionId: string): Promise<QueryResult> {
    return this.request<QueryResult>(`/api/v1/jobs/${transactionId}`);
  }

  /**
   * Execute a Cypher query and automatically wait for results
   * 
   * Combines `submitQuery()` + automatic polling. Blocks until query completes.
   * 
   * @param databaseId - Target database ID
   * @param query - Cypher query string
   * @param options - Query execution options
   * @param options.parameters - Query parameters (for parameterized queries)
   * @param options.pollInterval - How often to check status in ms (default: 1000)
   * @param options.timeout - Max wait time in ms (default: 30000)
   * @returns Query results with columns and rows
   * @throws {Error} If query times out or fails
   * 
   * @example
   * ```typescript
   * // Simple query
   * const result = await client.executeQuery('db-123', 'MATCH (n) RETURN n LIMIT 10');
   * 
   * // Parameterized query with custom timeout
   * const result = await client.executeQuery(
   *   'db-123',
   *   'MATCH (u:User WHERE u.name = $name) RETURN u',
   *   {
   *     parameters: { name: 'Alice' },
   *     timeout: 60000  // 1 minute
   *   }
   * );
   * 
   * console.log('Found', result.result.rows.length, 'results');
   * ```
   */
  async executeQuery(
    databaseId: string,
    query: string,
    options: {
      parameters?: Record<string, unknown>;
      pollInterval?: number;
      timeout?: number;
    } = {}
  ): Promise<QueryResult> {
    const { parameters, pollInterval = 1000, timeout = 30000 } = options;

    // Submit query
    const job = await this.submitQuery(databaseId, { query, parameters });

    // Poll for results
    const startTime = Date.now();
    while (true) {
      const result = await this.getQueryStatus(job.transaction_id);

      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Query timeout exceeded');
      }

      await this.sleep(pollInterval);
    }
  }

  // ==================== Snapshots ====================

  /**
   * Create a point-in-time snapshot backup of a database
   * 
   * @param databaseId - Database to backup
   * @returns Snapshot metadata with ID for restoration
   * @throws {Error} If backup fails or database locked
   * 
   * @example
   * ```typescript
   * const snapshot = await client.createSnapshot('db-123');
   * console.log('Backup created:', snapshot.snapshot_id);
   * 
   * // Later: restore from this snapshot
   * await client.restoreSnapshot('db-123', snapshot.snapshot_id);
   * ```
   */
  async createSnapshot(databaseId: string): Promise<{ snapshot_id: string }> {
    return this.request<{ snapshot_id: string }>(
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
  async listSnapshots(databaseId: string): Promise<unknown[]> {
    return this.request<unknown[]>(
      `/api/v1/databases/${databaseId}/snapshots`
    );
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
  ): Promise<void> {
    await this.request<void>(`/api/v1/databases/${databaseId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ snapshot_id: snapshotId }),
    });
  }

  // ==================== Server-Sent Events ====================

  /**
   * Generate a short-lived JWT token for Server-Sent Events (SSE)
   * 
   * Required for connecting to the real-time event stream.
   * Token expires after 5 minutes (300s) by default.
   * 
   * @returns JWT token for SSE authentication
   * @throws {Error} If API key is invalid
   * 
   * @example
   * ```typescript
   * const { token } = await client.getSseToken();
   * // Use token to connect to event stream
   * ```
   */
  async getSseToken(): Promise<{ token: string }> {
    return this.request<{ token: string }>('/api/v1/auth/sse-token', {
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
