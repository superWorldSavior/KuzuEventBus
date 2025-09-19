from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest

from src.domain.shared.ports.query_execution import TransactionStatus
from src.infrastructure.dependencies import redis_connection
from src.infrastructure.queue.redis_queue_service import RedisMessageQueueService
from src.infrastructure.transactions.redis_transaction_repository import RedisTransactionRepository
from src.infrastructure.kuzu.kuzu_query_execution_adapter import KuzuQueryExecutionAdapter
from src.infrastructure.workers.query_worker import QueryWorker


@pytest.fixture(autouse=True)
def _ensure_env(tmp_path, monkeypatch):
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    monkeypatch.setenv("ENVIRONMENT", "development")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_submit_then_worker_processes_and_emits_event():
    tenant_id = uuid4()
    database_id = uuid4()
    tx_id = uuid4()

    redis = redis_connection()
    stream = f"it-queries:{uuid4().hex}"

    queue = RedisMessageQueueService(redis, stream_name=stream, max_length=1000, block_ms=250)
    repo = RedisTransactionRepository(redis)

    # seed transaction and enqueue
    await repo.save_transaction(
        transaction_id=tx_id,
        tenant_id=tenant_id,
        database_id=database_id,
        query="RETURN 1 AS ok",
        parameters={},
        status=TransactionStatus.PENDING,
        timeout_seconds=5,
    )
    await queue.enqueue_transaction(tx_id, tenant_id, priority=0)

    worker = QueryWorker(queue=queue, transactions=repo, executor=KuzuQueryExecutionAdapter())
    await worker.run_once()

    # assert status completed
    tx = await repo.find_by_id(tx_id)
    assert tx is not None
    assert tx.get("status") == TransactionStatus.COMPLETED.value

    # assert SSE stream event exists
    entries = await redis.xread({f"events:{tenant_id}": "0-0"}, block=500, count=10)
    # entries: [(stream_key, [(entry_id, fields), ...])]
    assert entries, "No SSE entries found in events stream"
    found = False
    for _, messages in entries:
        for entry_id, fields in messages:
            if fields.get("transaction_id") == str(tx_id) and fields.get("event_type") == "completed":
                found = True
                break
        if found:
            break
    assert found, "Completed event not found in events stream"
