import { useSSEEvents, type SSEEvent } from './useSSEEvents';

export interface DatabaseCreatedEvent extends SSEEvent {
  event_type: 'database_created';
  database_id: string;
  database_name: string;
  filesystem_path: string;
}

export interface DatabaseDeletedEvent extends SSEEvent {
  event_type: 'database_deleted';
  database_id: string;
}

export interface SnapshotCreatedEvent extends SSEEvent {
  event_type: 'snapshot_created';
  snapshot_id: string;
  database_id: string;
  object_key: string;
  size_bytes: string;
}

export interface DatabaseRestoredEvent extends SSEEvent {
  event_type: 'database_restored';
  database_id: string;
  target_timestamp: string;
  snapshot_used: string;
  wal_files_replayed: string;
}

export interface FileUploadedEvent extends SSEEvent {
  event_type: 'file_uploaded';
  database_id: string;
  file_name: string;
  file_size: number;
}

export interface UseDatabaseEventsOptions {
  onDatabaseCreated?: (event: DatabaseCreatedEvent) => void;
  onDatabaseDeleted?: (event: DatabaseDeletedEvent) => void;
  onSnapshotCreated?: (event: SnapshotCreatedEvent) => void;
  onDatabaseRestored?: (event: DatabaseRestoredEvent) => void;
  onFileUploaded?: (event: FileUploadedEvent) => void;
  debug?: boolean;
}

/**
 * Hook to listen for database-related SSE events.
 * 
 * @example
 * ```tsx
 * useDatabaseEvents({
 *   onDatabaseCreated: (event) => {
 *     toast.success(`Database ${event.database_name} is ready!`);
 *     refetchDatabases();
 *   },
 *   onDatabaseRestored: (event) => {
 *     toast.success('Database restored successfully');
 *     refetchData();
 *   },
 *   onSnapshotCreated: (event) => {
 *     toast.success('Snapshot created');
 *     refetchSnapshots();
 *   },
 * });
 * ```
 */
export function useDatabaseEvents({
  onDatabaseCreated,
  onDatabaseDeleted,
  onSnapshotCreated,
  onDatabaseRestored,
  onFileUploaded,
  debug,
}: UseDatabaseEventsOptions = {}) {
  useSSEEvents({
    eventTypes: [
      'database_created',
      'database_deleted',
      'snapshot_created',
      'database_restored',
      'file_uploaded',
    ],
    handlers: {
      database_created: onDatabaseCreated as any,
      database_deleted: onDatabaseDeleted as any,
      snapshot_created: onSnapshotCreated as any,
      database_restored: onDatabaseRestored as any,
      file_uploaded: onFileUploaded as any,
    },
    debug,
  });
}
