import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';

interface PitrParams {
  start?: string;
  end?: string;
  window?: 'minute' | 'hour' | 'day';
  include_types?: boolean;
  include_queries?: boolean;
}

/**
 * Hook to fetch PITR (Point-In-Time Recovery) timeline for a database
 */
export function useDatabasePitr(
  databaseId: string,
  params?: PitrParams
) {
  return useQuery({
    queryKey: ['database-pitr', databaseId, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.start) qs.set('start', params.start);
      if (params?.end) qs.set('end', params.end);
      if (params?.window) qs.set('window', params.window);
      if (params?.include_types !== undefined) qs.set('include_types', String(params.include_types));
      if (params?.include_queries !== undefined) qs.set('include_queries', String(params.include_queries));
      
      const url = `/api/v1/databases/${databaseId}/pitr${qs.toString() ? `?${qs.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: !!databaseId,
    staleTime: 30000, // 30 seconds
  });
}
