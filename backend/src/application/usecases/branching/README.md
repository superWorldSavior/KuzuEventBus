# Branching Use Cases

This document explains how branch creation works, including creating a branch from HEAD (latest) and from a Point-In-Time Recovery (PITR) timestamp.

## Files and Modules

- `create_branch.py`: Orchestrates branch creation.
- `restore_database_from_snapshot.py`: Restores a database from a snapshot (overwrite mode).
- `restore_database_pitr.py`: PITR logic (nearest snapshot + WAL replay) for restoring a database to a timestamp.
- API wiring in `presentation/api/branches/routes.py`.

## Branch naming

- Business value object: `BranchName`
- Full branch name format: `<parent_db_name>--branch--<branch_name>`

## Create Branch API

Endpoint:
- `POST /api/v1/branches/`

Request body:
```json
{
  "source_database": "<database name or UUID>",
  "branch_name": "<name>",
  "from_snapshot": "latest | <snapshot UUID> | <ISO timestamp>",
  "description": "<optional>"
}
```

Behavior of `from_snapshot`:
- `latest` (or null):
  - Create a snapshot of the source database now.
  - Provision branch database.
  - Restore the newly created snapshot into the branch.
- `<snapshot UUID>`:
  - Provision branch database.
  - Restore the provided snapshot UUID into the branch.
- `<ISO timestamp>` (e.g., `2025-10-03T09:32:59+00:00`):
  - Find the nearest snapshot BEFORE the timestamp on the SOURCE database.
  - Provision branch database.
  - Restore the nearest snapshot into the branch.
  - Replay WAL files from the SOURCE between the snapshot time and the target timestamp, applying mutations to the BRANCH.

If no snapshot exists before the timestamp, the request fails with a 400-like error (value error surfaced).

## PITR-based branching details

When `from_snapshot` is a timestamp, `CreateBranchUseCase` performs a PITR clone:

1. Lookup nearest snapshot before the timestamp on the source database.
2. Provision the branch database using `ProvisionTenantResourcesUseCase`.
3. Restore that snapshot into the branch using `RestoreDatabaseFromSnapshotUseCase`.
4. Replay WAL from the SOURCE onto the BRANCH up to the target timestamp.

### WAL storage layout

- Object storage prefix: `tenants/{tenant_id}/{database_id}/wal/`
- File naming convention: `wal-YYYYMMDDTHHMMSSZ.log`
- Content format: JSON Lines, each line with at least:
  - `ts`: ISO timestamp (optional but recommended)
  - `query`: Cypher query string

During replay:
- Files are ordered by the timestamp in the filename.
- Entries are applied sequentially.
- If an entry `ts` exceeds the target timestamp, replay stops.
- Per-entry failures are logged and ignored (idempotent best-effort replay).

### Locks and cache

- Snapshot creation and restore acquire distributed locks to avoid concurrent writes.
- Cache entries like `db_info:{database_id}` are invalidated after destructive operations.

## Implementation notes

- `CreateBranchUseCase` supports three modes via `from_snapshot`:
  - `latest` (snapshot-now)
  - snapshot UUID
  - ISO timestamp (PITR clone)
- Timestamp parsing accepts timezone-aware ISO strings; naive timestamps are treated as UTC.
- For PITR clone, `CreateBranchUseCase` needs these dependencies (wired via DI in `routes.py`):
  - `KuzuDatabaseRepository` (to resolve branch DB file path)
  - `SnapshotRepository` (to list snapshots)
  - `FileStorageService` (to list/download WAL files)
  - `DistributedLockService` and `CacheService` (consistency)
  - `KuzuQueryService` (to execute replay queries against the branch file path)

## Error handling

- Invalid `branch_name` → `ValueError("Invalid branch name: ...")`
- No source database or missing file path → explicit errors from underlying use cases
- `from_snapshot` invalid value → `ValueError("Invalid from_snapshot format. Use 'latest', snapshot UUID, or ISO timestamp")`
- No snapshot before timestamp → `ValueError("No snapshot found before <timestamp>")`

Errors bubble up through the API layer, which returns proper JSON details for the client.

## Tests

Unit tests (pytest):

- `application/usecases/branching/__tests__/test_create_branch_usecase.py`
  - Existing coverage for latest and snapshot UUID paths
- `application/usecases/branching/__tests__/test_create_branch_from_timestamp.py`
  - `test_create_branch_from_timestamp_clones_with_wal_replay`
  - `test_create_branch_from_timestamp_no_snapshot_before_raises`

Run:
```bash
pytest -q
pytest src/application/usecases/branching/__tests__/test_create_branch_from_timestamp.py -q
```

## Future work

- Factor common PITR helpers (nearest snapshot, WAL listing, WAL replay) into a shared module used by both `RestoreDatabasePITRUseCase` and `CreateBranchUseCase`.
- Add pagination or batching for large WAL sets.
- Harden WAL entry schema validation and error classes.
