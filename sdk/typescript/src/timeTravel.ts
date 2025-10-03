/**
 * Time Travel API - Simple interface for database time-travel operations
 * 
 * Provides intuitive methods to explore history, preview past states,
 * and restore databases to specific points in time.
 */

// ==================== Types ====================

export interface TimelineHistory {
  database: string;
  period: { from: string; to: string };
  events: TimelineEvent[];
  totalSnapshots: number;
  totalTransactions: number;
}

export interface TimelineEvent {
  type: 'snapshot' | 'transaction' | 'checkpoint';
  timestamp: string;
  description?: string;
  size_bytes?: number;
  query?: string;
  name?: string;  // For checkpoints
}

export interface PreviewSnapshot {
  at: string;
  queryResult: any;
  metadata: {
    snapshotUsed?: string;
    transactionsReplayed: number;
    restoredAt: string;
  };
}

export interface RestoreResult {
  restored: boolean;
  database_id: string;
  restoredTo: string;
  mode: string;
  restored_at: string;
}


export interface ViewHistoryOptions {
  from?: string;  // ISO timestamp or human format
  to?: string;
  includeQueries?: boolean;
}

export interface PreviewOptions {
  at: string;  // ISO timestamp or human format
  query?: string;  // Test query (default: MATCH (n) RETURN count(n) LIMIT 100)
}

// ==================== Time Travel API ====================

export class TimeTravelAPI {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, getHeaders: () => Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = getHeaders();
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Time Travel API Error: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * View the complete history of a database over a time period.
   * 
   * @param dbId - Database ID or name
   * @param options - Time range and filters
   * @returns Timeline with snapshots and transactions
   * 
   * @example
   * ```typescript
   * const history = await client.timeTravel.viewHistory('my-db', {
   *   from: 'yesterday',
   *   includeQueries: true
   * });
   * console.log('Events:', history.events);
   * ```
   */
  async viewHistory(
    dbId: string,
    options: ViewHistoryOptions = {}
  ): Promise<TimelineHistory> {
    const params = new URLSearchParams();
    
    if (options.from) {
      params.append('start', parseHumanTime(options.from));
    }
    if (options.to) {
      params.append('end', parseHumanTime(options.to));
    }
    if (options.includeQueries) {
      params.append('include_queries', 'true');
    }

    const response = await this.request<any>(
      `/api/v1/databases/${dbId}/pitr?${params.toString()}`
    );

    // Map backend response to friendly format
    return {
      database: dbId,
      period: {
        from: options.from || response.start || 'beginning',
        to: options.to || response.end || 'now',
      },
      events: this.mapTimelineEvents(response),
      totalSnapshots: response.snapshots?.length || 0,
      totalTransactions: response.transactions?.length || 0,
    };
  }

  /**
   * Preview the state of the database at a specific point in time.
   * 
   * **Non-destructive**: Shows what the data looked like WITHOUT modifying the database.
   * 
   * @param dbId - Database ID or name
   * @param options - Target timestamp and optional test query
   * @returns Preview result with query output
   * 
   * @example
   * ```typescript
   * const preview = await client.timeTravel.preview('my-db', {
   *   at: 'yesterday',
   *   query: 'MATCH (u:User) RETURN count(u)'
   * });
   * console.log('State at that time:', preview.queryResult);
   * ```
   */
  async preview(
    dbId: string,
    options: PreviewOptions
  ): Promise<PreviewSnapshot> {
    const timestamp = parseHumanTime(options.at);
    const query = options.query || 'MATCH (n) RETURN count(n) as total LIMIT 100';

    const params = new URLSearchParams({
      target_timestamp: timestamp,
      preview_query: query,
    });

    const response = await this.request<any>(
      `/api/v1/databases/${dbId}/pitr/preview?${params.toString()}`
    );

    return {
      at: timestamp,
      queryResult: response.preview_results || response.results,
      metadata: {
        snapshotUsed: response.snapshot_used,
        transactionsReplayed: response.transactions_replayed || 0,
        restoredAt: response.restored_at || new Date().toISOString(),
      },
    };
  }

  /**
   * Restore the database to a specific point in time.
   * 
   * **WARNING**: This OVERWRITES the current database state!
   * Use `preview()` first to verify the target state.
   * 
   * @param dbId - Database ID or name
   * @param when - Target timestamp (ISO or human format like 'yesterday')
   * @returns Restore confirmation
   * 
   * @example
   * ```typescript
   * // Preview first (safe)
   * await client.timeTravel.preview('my-db', { at: '2 hours ago' });
   * 
   * // Then restore (destructive!)
   * await client.timeTravel.goBackTo('my-db', '2 hours ago');
   * ```
   */
  async goBackTo(dbId: string, when: string): Promise<RestoreResult> {
    const timestamp = parseHumanTime(when);

    const response = await this.request<any>(
      `/api/v1/databases/${dbId}/restore-pitr`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_timestamp: timestamp }),
      }
    );

    return {
      restored: response.restored || true,
      database_id: response.database_id || dbId,
      restoredTo: timestamp,
      mode: response.mode || 'pitr',
      restored_at: response.restored_at || new Date().toISOString(),
    };
  }


  // ==================== Helper Methods ====================

  private mapTimelineEvents(response: any): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Add snapshots
    if (response.snapshots) {
      for (const snap of response.snapshots) {
        events.push({
          type: 'snapshot',
          timestamp: snap.created_at || snap.timestamp,
          description: `Snapshot created`,
          size_bytes: snap.size_bytes,
        });
      }
    }

    // Add transactions
    if (response.transactions) {
      for (const tx of response.transactions) {
        events.push({
          type: 'transaction',
          timestamp: tx.timestamp || tx.created_at,
          description: tx.description || 'Query executed',
          query: tx.query,
        });
      }
    }

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  }
}

// ==================== Time Parsing Utilities ====================

/**
 * Parse human-friendly time expressions into ISO timestamps.
 * 
 * Supported formats:
 * - ISO 8601: '2024-01-15T10:30:00Z'
 * - Relative: 'yesterday', '2 hours ago', '3 days ago'
 * - Named: 'last monday', 'last week'
 */
function parseHumanTime(when: string): string {
  // Already ISO format
  if (when.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return when;
  }

  const now = new Date();
  let targetDate = new Date(now);

  // Parse relative times
  if (when === 'now') {
    return now.toISOString();
  }

  if (when === 'yesterday') {
    targetDate.setDate(now.getDate() - 1);
    return targetDate.toISOString();
  }

  if (when === 'last week') {
    targetDate.setDate(now.getDate() - 7);
    return targetDate.toISOString();
  }

  // Pattern: "X hours/days/minutes ago"
  const relativeMatch = when.match(/^(\d+)\s+(minute|hour|day|week)s?\s+ago$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    switch (unit) {
      case 'minute':
        targetDate.setMinutes(now.getMinutes() - amount);
        break;
      case 'hour':
        targetDate.setHours(now.getHours() - amount);
        break;
      case 'day':
        targetDate.setDate(now.getDate() - amount);
        break;
      case 'week':
        targetDate.setDate(now.getDate() - (amount * 7));
        break;
    }

    return targetDate.toISOString();
  }

  // Try parsing as date string
  const parsed = new Date(when);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Fallback: return as-is and let backend handle
  return when;
}
