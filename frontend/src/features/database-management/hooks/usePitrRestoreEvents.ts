import { useDatabaseEvents } from '@/shared/hooks/useDatabaseEvents';

interface UsePitrRestoreEventsOptions {
  selectedDatabaseId: string | null;
  onRestored: (event: { database_id: string; target_timestamp: string }) => void;
  debug?: boolean;
}

/**
 * Listen to database_restored SSE events for the currently selected database
 * and trigger UI updates via the provided callback.
 */
export function usePitrRestoreEvents({ selectedDatabaseId, onRestored, debug = false }: UsePitrRestoreEventsOptions) {
  useDatabaseEvents({
    onDatabaseRestored: (event) => {
      if (!selectedDatabaseId) return;
      if (event.database_id !== selectedDatabaseId) return;
      onRestored({ database_id: event.database_id, target_timestamp: event.target_timestamp });
    },
    debug,
  });
}
