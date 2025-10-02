# Databases API

Endpoints for database provisioning, metadata, snapshots, PITR (Point-In-Time Recovery), uploads, and bookmarks.

Base path: `/api/v1/databases`

## Provisioning

- POST `/provision/{tenant_id}`
  - Body: `{ "database_name": "main" }`
  - Returns: `ProvisionResponse` (tenant_id, bucket, database_name, database_id, filesystem_path, created_at)

## List databases (by current tenant)

- GET `/`
  - Returns: list of databases for the authenticated tenant

## Database metadata

- GET `/{database_id}`
  - Returns: `DatabaseResponse`

## Upload a file to database storage

- POST `/{database_id}/upload`
  - Body: `{ "file_name": "dump.tar.gz", "file_content_base64": "..." }`
  - Returns: `{ file_path, file_size, uploaded_at, upload_url? }`

## Snapshots

- POST `/{database_id}/snapshots`
  - Description: create snapshot (.tar.gz if directory, else .kuzu)
  - Returns: `{ id, object_key, checksum, size_bytes, created_at }`

- GET `/{database_id}/snapshots`
  - Returns: `{ database_id, snapshots: [ { id, object_key, checksum, size_bytes, created_at } ], count }`

- POST `/{database_id}/restore`
  - Body: `{ "snapshot_id": "uuid" }`
  - Restores snapshot over current DB (atomic swap, distributed lock). Returns `{ restored, database_id, mode, restored_at }`

## PITR (Point-In-Time Recovery)

- GET `/{database_id}/pitr`
  - Query params:
    - `start`: ISO 8601 (e.g. `2025-01-01T00:00:00Z`)
    - `end`: ISO 8601
    - `window`: `minute|hour` (default `minute`) — aggregation window for `wal_windows`
    - `include_types`: `true|false` — include query type breakdown per window
    - `target`: ISO 8601 — when provided, compute a restore plan to reach `target`
  - Returns:
    ```json
    {
      "database_id": "...",
      "start": "...",
      "end": "...",
      "snapshots": [ { "id", "object_key", "checksum", "size_bytes", "created_at" } ],
      "wal_files": [ { "key", "timestamp", "size" } ],
      "wal_windows": [ { "start", "end", "files", "bytes", "types": {"CREATE": 10, "READ": 20} } ],
      "plan": {
        "target_timestamp": "...",
        "snapshot": { ... },
        "wal_files": [ {"key","timestamp","size"} ],
        "wal_count": 2,
        "estimate": { "bytes_to_read": 12345 }
      }
    }
    ```

- POST `/{database_id}/restore-pitr`
  - Query param: `target_timestamp` (ISO 8601)
  - Restores DB to target time using nearest snapshot + WAL replay. Returns `{ restored, database_id, target_timestamp, snapshot_used, wal_files_replayed, restored_at }`

### PITR Bookmarks

- GET `/{database_id}/pitr/bookmarks`
  - Returns: `{ database_id, bookmarks: [ { id, name, timestamp } ] }`

- POST `/{database_id}/pitr/bookmarks`
  - Body: `{ "name": "after-import", "timestamp": "2025-01-01T10:12:03Z" }`
  - Upsert a bookmark for the database

- DELETE `/{database_id}/pitr/bookmarks/{name}`
  - Returns: `{ deleted: true|false }`

## Error codes
- 400: invalid request/body/format, snapshot missing, PITR planning/restore errors
- 401: unauthorized
- 404: resource not found

## Notes
- Authentication and tenant scoping handled by middleware; `tenant_id` is resolved from request context.
- WAL storage convention: `tenants/{tenant_id}/{database_id}/wal/wal-YYYYMMDDThhmmssZ.log` with JSON-lines payloads.
- Snapshots stored under `tenants/{tenant_id}/{database_id}/snapshots/` as `.tar.gz` (directory snapshots) or `.kuzu` (single file).
