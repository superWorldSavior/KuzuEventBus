import { apiClient } from '@/shared/api/client';

export interface BranchResponse {
  name: string;
  full_name: string;
  parent: string;
  snapshot_id: string | null;
  created_at: string;
  description: string | null;
}

export interface BranchListResponse {
  database: string;
  branches: BranchResponse[];
  count: number;
}

export interface CreateBranchRequest {
  source_database: string;
  branch_name: string;
  from_snapshot?: string | null;
  description?: string | null;
}

export const branchApi = {
  /**
   * Create a new branch from a database
   */
  async create(request: CreateBranchRequest): Promise<BranchResponse> {
    try {
      const response = await apiClient.post<BranchResponse>('/api/v1/branches/', request);
      return response.data;
    } catch (error: any) {
      const detail = error?.response?.data?.detail ?? error?.response?.data ?? error?.message ?? 'Unknown error';
      console.error('[BranchAPI] create failed:', detail, error?.response?.data);
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
  },

  /**
   * List all branches of a database
   */
  async list(database: string): Promise<BranchListResponse> {
    const response = await apiClient.get<BranchListResponse>(`/api/v1/branches/of/${database}`);
    return response.data;
  },

  /**
   * Delete a branch
   */
  async delete(branchName: string): Promise<{ deleted: boolean; branch: string }> {
    const response = await apiClient.delete(`/api/v1/branches/${branchName}`);
    return response.data;
  },

  /**
   * Merge a branch into target database
   */
  async merge(branchName: string, targetDatabase: string): Promise<{ merged: boolean; branch: string; target: string; snapshot_id: string }> {
    const response = await apiClient.post(`/api/v1/branches/${branchName}/merge`, {
      target_database: targetDatabase,
    });
    return response.data;
  },
};
