/**
 * Kuzu Event Bus - TypeScript SDK
 * Simple HTTP client for interacting with the API
 */

import { TimeTravelAPI } from './timeTravel';
import { BranchesAPI } from './branches';

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
  
  /**
   * Time Travel API - Explore history, preview past states, and restore databases
   * 
   * Automatic PITR (Point-In-Time Recovery) without manual checkpoints.
   * The system automatically tracks all changes via snapshots + WAL.
   * 
   * @example
   * ```typescript
   * // View complete history
   * const history = await client.timeTravel.viewHistory('my-db', { 
   *   from: 'yesterday',
   *   includeQueries: true 
   * });
   * 
   * // Preview before restoring (non-destructive!)
   * const preview = await client.timeTravel.preview('my-db', { 
   *   at: '2 hours ago',
   *   query: 'MATCH (n) RETURN count(n)'
   * });
   * 
   * // Restore to any point in time
   * await client.timeTravel.goBackTo('my-db', '2 hours ago');
   * ```
   */
  public readonly timeTravel: TimeTravelAPI;

  /**
   * Branches API - Git-like branching for databases
   * 
   * Create isolated branches for testing/development without affecting production.
   * 
   * @example
   * ```typescript
   * // Create branch from prod
   * const branch = await client.branches.create({
   *   sourceDatabase: 'prod-db',
   *   branchName: 'test-migration',
   *   fromSnapshot: 'latest'
   * });
   * 
   * // Work on branch (isolated)
   * await client.executeQuery(branch.fullName, 'CREATE (:Test {...})');
   * 
   * // Merge back to prod when ready
   * await client.branches.merge(branch.fullName, { targetDatabase: 'prod-db' });
   * 
   * // Or discard
   * await client.branches.delete(branch.fullName);
   * ```
   */
  public readonly branches: BranchesAPI;

  constructor(config: KuzuClientConfig) {
    this.config = config;
    
    const getHeaders = () => ({
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    });
    
    // Initialize Time Travel API
    this.timeTravel = new TimeTravelAPI(config.baseUrl, getHeaders);
    
    // Initialize Branches API
    this.branches = new BranchesAPI(config.baseUrl, getHeaders);
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
   * @param database - Database ID (UUID) or name
   * @returns Database metadata including creation date
   * @throws {Error} If database not found or unauthorized
   * 
   * @example
   * ```typescript
   * // By name
   * const db = await client.getDatabase('my-social-network');
   * 
   * // Or by UUID
   * const db = await client.getDatabase('550e8400-...');
   * ```
   */
  async getDatabase(database: string): Promise<Database> {
    return this.request<Database>(`/api/v1/databases/${database}`);
  }

  /**
   * Permanently delete a database and all its data
   * 
   * @param database - Database ID (UUID) or name
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} If database not found or deletion fails
   * 
   * @example
   * ```typescript
   * await client.deleteDatabase('my-social-network');
   * ```
   */
  async deleteDatabase(database: string): Promise<void> {
    await this.request<void>(`/api/v1/databases/${database}`, {
      method: 'DELETE',
    });
  }

  // ==================== Queries ====================

  /**
   * Submit a Cypher query for async execution (queued job).
   * 
   * @param database - Database ID (UUID) or name
   * @param request - Query request with query text, parameters, and timeout
   * @returns Job submission response with transaction ID
   */
  async submitQuery(
    database: string,
    request: QueryRequest
  ): Promise<QuerySubmitResponse> {
    // Map SDK naming to backend (timeout_seconds)
    const body = {
      query: request.query,
      parameters: request.parameters,
      timeout_seconds: request.timeoutSeconds,
    };
    return this.request<QuerySubmitResponse>(
      `/api/v1/databases/${database}/query`,
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

  /**
   * Execute a query and wait for results (convenience method).
   * 
   * Automatically submits, polls status, and fetches results.
   * 
   * @param database - Database ID (UUID) or name
   * @param query - Cypher query string
   * @param options - Execution options (parameters, timeouts, poll interval)
   * @returns Query results
   * 
   * @example
   * ```typescript
   * const result = await client.executeQuery('my-db', 
   *   'MATCH (n:User) WHERE n.age > $minAge RETURN n',
   *   { parameters: { minAge: 18 } }
   * );
   * console.log('Results:', result.results);
   * ```
   */
  async executeQuery(
    database: string,
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
    const job = await this.submitQuery(database, { query, parameters, timeoutSeconds: submitTimeoutSeconds });

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

  /**
   * Create a manual snapshot (full backup) of the database.
   * 
   * @param database - Database ID (UUID) or name
   * @returns Snapshot metadata
   */
  async createSnapshot(database: string): Promise<Snapshot> {
    return this.request<Snapshot>(
      `/api/v1/databases/${database}/snapshots`,
      { method: 'POST' }
    );
  }

  /**
   * List all available snapshots for a database
   * 
   * @param database - Database ID (UUID) or name
   * @returns Array of snapshot metadata (ID, creation date, size)
   * @throws {Error} If database not found
   * 
   * @example
   * ```typescript
   * const snapshots = await client.listSnapshots('my-db');
   * ```
   */
  async listSnapshots(database: string): Promise<Snapshot[]> {
    const res = await this.request<SnapshotListResponse>(
      `/api/v1/databases/${database}/snapshots`
    );
    return res.snapshots;
  }

  /**
   * Restore a database to a previous snapshot state
   * 
   * **WARNING**: This overwrites current database content!
   * 
   * @param database - Database ID (UUID) or name
   * @param snapshotId - Snapshot ID to restore from
   * @returns Restore confirmation
   * @throws {Error} If snapshot not found or restoration fails
   * 
   * @example
   * ```typescript
   * await client.restoreSnapshot('my-db', 'snap-abc456');
   * ```
   */
  async restoreSnapshot(
    database: string,
    snapshotId: string
  ): Promise<RestoreResponse> {
    return this.request<RestoreResponse>(`/api/v1/databases/${database}/restore`, {
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
