/**
 * Database Branching API
 * 
 * Git-like branching for databases:
 * - Create isolated branches for testing/development
 * - Work on branches without affecting production
 * - Merge branches back or discard them
 */

// ==================== Types ====================

export interface CreateBranchOptions {
  sourceDatabase: string;  // Source DB (UUID or name)
  branchName: string;      // Branch name (will be prefixed)
  fromSnapshot?: string;   // 'latest', timestamp, or snapshot ID
  description?: string;
}

export interface Branch {
  name: string;            // Branch short name
  fullName: string;        // Full DB name with --branch-- prefix
  parent: string;          // Parent database name
  snapshotId: string | null;
  createdAt: string;
  description?: string | null;
}

export interface MergeOptions {
  targetDatabase: string;  // Target DB to merge into
}

// ==================== Branches API ====================

export class BranchesAPI {
  private baseUrl: string;
  private getHeaders: () => Record<string, string>;

  constructor(baseUrl: string, getHeaders: () => Record<string, string>) {
    this.baseUrl = baseUrl;
    this.getHeaders = getHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Branches API Error: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create an isolated branch from a database.
   * 
   * The branch is a full copy (snapshot+restore) that you can modify
   * without affecting the original database.
   * 
   * @param options - Branch configuration
   * @returns Branch metadata including full name
   * 
   * @example
   * ```typescript
   * // Create branch from prod for testing
   * const branch = await client.branches.create({
   *   sourceDatabase: 'prod-db',
   *   branchName: 'test-migration-v2',
   *   fromSnapshot: 'latest'  // or 'yesterday', timestamp, snapshot ID
   * });
   * 
   * console.log('Branch created:', branch.fullName);
   * // → 'prod-db--branch--test-migration-v2'
   * 
   * // Work on the branch (isolated from prod)
   * await client.executeQuery(branch.fullName, 'CREATE (:NewFeature {...})');
   * 
   * // Merge back to prod when ready
   * await client.branches.merge(branch.fullName, { targetDatabase: 'prod-db' });
   * ```
   */
  async create(options: CreateBranchOptions): Promise<Branch> {
    return this.request<Branch>('/api/v1/branches/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_database: options.sourceDatabase,
        branch_name: options.branchName,
        from_snapshot: options.fromSnapshot || 'latest',
        description: options.description,
      }),
    });
  }

  /**
   * List all branches for a database.
   * 
   * @param database - Database ID (UUID) or name
   * @returns Array of branches
   * 
   * @example
   * ```typescript
   * const branches = await client.branches.list('prod-db');
   * branches.forEach(b => {
   *   console.log(`${b.name} (created ${b.createdAt})`);
   * });
   * ```
   */
  async list(database: string): Promise<Branch[]> {
    const response = await this.request<{ branches: Branch[] }>(
      `/api/v1/branches/of/${database}`
    );
    return response.branches;
  }

  /**
   * Merge a branch into a target database.
   * 
   * **WARNING**: This OVERWRITES the target database with the branch content!
   * Always test with preview/diff before merging to production.
   * 
   * @param branchName - Branch full name (with --branch-- prefix)
   * @param options - Merge options including target database
   * @returns Merge confirmation
   * 
   * @example
   * ```typescript
   * // After testing on branch
   * const branch = 'prod-db--branch--alice-feature';
   * 
   * // Merge to prod (destructive!)
   * await client.branches.merge(branch, { 
   *   targetDatabase: 'prod-db' 
   * });
   * ```
   */
  async merge(branchName: string, options: MergeOptions): Promise<{
    merged: boolean;
    branch: string;
    target: string;
    snapshotId: string;
  }> {
    return this.request(`/api/v1/branches/${branchName}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_database: options.targetDatabase,
      }),
    });
  }

  /**
   * Delete a branch.
   * 
   * Removes the branch database and frees up disk space.
   * Cannot be undone.
   * 
   * @param branchName - Branch full name (with --branch-- prefix)
   * 
   * @example
   * ```typescript
   * // Clean up after testing
   * await client.branches.delete('prod-db--branch--test');
   * ```
   */
  async delete(branchName: string): Promise<{ deleted: boolean; branch: string }> {
    return this.request(`/api/v1/branches/${branchName}`, {
      method: 'DELETE',
    });
  }
}
