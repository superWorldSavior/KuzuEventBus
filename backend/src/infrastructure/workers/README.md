# Query Worker

Asynchronous worker that consumes Redis Streams jobs and executes Cypher queries on Kuzu.

## Scope & Responsibilities

- Dequeue transactions from Redis Streams via `RedisMessageQueueService`.
- Load transaction metadata via `TransactionRepository` (Redis-backed).
- Ensure the local Kuzu database exists under `KUZU_DATA_DIR/` by checking out the latest snapshot from MinIO when needed.
- Execute the query via `QueryExecutionService` (Kuzu adapter).
- Update transaction status and counts in `TransactionRepository`.
- Cache results for retrieval by `/api/v1/jobs/{transaction_id}/results`.
- Emit SSE-compatible events into a Redis Stream for UI catch-up.
- Acknowledge the queue message when processing completes.

Source: `src/infrastructure/workers/query_worker.py`

## Processing Flow

1. `dequeue_transaction()`
2. `find_by_id(transaction_id)`
3. `_ensure_local_db(tenant_id, database_id)`
4. `execute_query(tenant_id, database_id, cypher, ...)`
5. `update_status(..., COMPLETED|FAILED|TIMEOUT, result_count, error_message)`
6. Cache results + emit event
7. `acknowledge_transaction(message_id)`

### MinIO Checkout (local workspace)

Implemented in `QueryWorker._ensure_local_db()`:

- Compute expected path: `KUZU_DATA_DIR/<tenant_id>/<database_id>/data.kuzu`.
- If missing, obtain the latest snapshot from `SnapshotRepository.list_by_database(database_id, tenant_id)`.
- Acquire a short distributed lock `db:{database_id}:checkout` via `RedisDistributedLockService` to avoid concurrent restore.
- Download the snapshot via `FileStorageService.download_database(object_key)`.
  - If `.tar.gz`, extract under the parent directory (directory snapshot).
  - If `.kuzu`, write bytes to `data.kuzu` (file snapshot).
- Release the lock.

This keeps query execution fully local (no MinIO reads during writes), while preserving durability through snapshots managed elsewhere (create/restore use cases).

### Status & Events

- Status transitions written to Redis Hash (see Transactions README): `RUNNING → COMPLETED|FAILED|TIMEOUT`.
- SSE catch-up uses a Redis Stream key `events:{tenant_id}` (see `_emit_event`).

## Environment

- `KUZU_DATA_DIR` must be set (shared volume in Docker).
- Redis available for queue, cache, locks, and events.
- MinIO available for snapshots (via `MinioFileStorageService`).

## Tests

- Unit:
  - `src/infrastructure/workers/__tests__/test_query_worker.py` — happy path, failure, timeout (fully mocked, no external deps).
  - `src/infrastructure/workers/__tests__/test_query_worker_checkout.py` — validates local checkout directory creation.

Run:
```bash
pytest src/infrastructure/workers/__tests__/ -q
```

## Related Components

- `src/infrastructure/transactions/redis_transaction_repository.py` — transaction status storage and indexing.
- `src/infrastructure/queue/redis_queue_service.py` — Redis Streams for job queueing.
- `src/infrastructure/file_storage/minio_service.py` — MinIO client adapter.
- `src/application/usecases/create_database_snapshot.py` — snapshot creation & upload.
- `src/application/usecases/restore_database_from_snapshot.py` — snapshot restore (overwrite) with locks and atomic swap.
