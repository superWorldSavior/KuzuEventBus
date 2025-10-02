# Transactions (Redis-backed)

Implementation: `src/infrastructure/transactions/redis_transaction_repository.py`

Stores async query transactions and their statuses in Redis using simple, inspectable primitives.

## Data Model (Redis Keys)

- **Hash per transaction**: `tx:<transaction_id>`
  - `transaction_id`: UUID string
  - `tenant_id`: UUID string
  - `database_id`: UUID string
  - `query`: Cypher text (string)
  - `parameters`: JSON-encoded dict
  - `status`: one of `pending|running|completed|failed|timeout`
  - `timeout_seconds`: string int
  - `created_at`, `updated_at`: ISO 8601 (UTC)
  - `started_at`: ISO 8601 (set when status becomes RUNNING)
  - `completed_at`: ISO 8601 (set when status becomes COMPLETED/FAILED/TIMEOUT)
  - `result_count`: number of rows (string int)
  - `error_message`: free text on failure

- **Set of transaction IDs per tenant**: `tx:tenant:<tenant_id>:ids`
- **Set of running transaction IDs**: `tx:running`

All keys are namespaced with the `prefix` (default `tx:`).

## Operations

- `save_transaction(...)` → create the hash and index in tenant set. If initial status is `running`, add to `tx:running`.
- `find_by_id(tx_id)` → fetch hash and return a dict (values are strings).
- `find_by_tenant(tenant_id, limit, offset)` → page through IDs from `tx:tenant:<tenant_id>:ids` and fetch hashes via a pipeline.
- `find_running_transactions()` → iterate `tx:running` and fetch all hashes via a pipeline.
- `update_status(tx_id, status, result_count, error_message)` → update hash fields, set timing fields, and maintain membership of `tx:running` set.

## Notes

- The repository is an MVP designed for high-throughput async jobs. It can be swapped for a Postgres-backed implementation without changing the domain port.
- String encoding: with `decode_responses=True` on the Redis client, values are strings; casting is left to callers when needed.

## Related

- Queue (Redis Streams): `src/infrastructure/queue/redis_queue_service.py`
- Worker: `src/infrastructure/workers/query_worker.py`
- API endpoints: `/api/v1/jobs/{transaction_id}`, `/api/v1/jobs/{transaction_id}/results`
