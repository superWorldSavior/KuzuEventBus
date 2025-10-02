# Queue (Redis Streams)

Implementation: `src/infrastructure/queue/redis_queue_service.py`

Provides the message queue used by the async query pipeline.

## Stream & Message Format

- **Stream name**: `query_transactions` (configurable via ctor)
- **Consumer group**: created on demand by the worker (e.g. `queries`)
- **Enqueued fields**:
  - `transaction_id`: UUID string
  - `tenant_id`: UUID string
  - `priority`: string int

Messages are appended with `XADD`, read with `XREADGROUP`, acknowledged via `XACK` then deleted via `XDEL`.

## API

- `enqueue_transaction(tx_id, tenant_id, priority)` → adds an entry to the stream with `maxlen` cap.
- `dequeue_transaction(consumer_group, consumer_name)` → ensures group exists, blocks up to `block_ms`, returns dict with `message_id`, ids and raw payload.
- `acknowledge_transaction(consumer_group, message_id)` → `XACK` + `XDEL`.
- `publish_notification(tenant_id, transaction_id, event_type, data)` → publishes a JSON payload on `notifications:{tenant_id}` (Redis Pub/Sub) for clients that subscribe to notifications rather than SSE.

## Interaction with Worker

The worker (`src/infrastructure/workers/query_worker.py`):

1. Calls `dequeue_transaction()` in a loop (group=`queries`, consumer=`worker-1` by default).
2. Processes the job (see Worker README), updates transaction status in Redis Hashes.
3. Emits SSE catch-up events into `events:{tenant_id}` (Redis Stream; not part of this adapter but same Redis instance).
4. Calls `acknowledge_transaction()` to finalize the message.

## Environment

The queue adapter uses the shared Redis client configured by DI. Typical environment variable:

- `REDIS_URL=redis://redis:6379/0`

## Tests

- `src/infrastructure/queue/__tests__/test_redis_queue_service.py` — integration tests (skip automatically if Redis is unavailable).

Run (inside API container or with Redis available locally):
```bash
pytest src/infrastructure/queue/__tests__/test_redis_queue_service.py -q
```
