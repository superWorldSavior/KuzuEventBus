"""Integration tests for RedisMessageQueueService."""
from __future__ import annotations

import asyncio
import uuid

import pytest
import pytest_asyncio

from src.infrastructure.redis import RedisMessageQueueService, redis_client


@pytest_asyncio.fixture(scope="function")
async def redis_connection():
    try:
        client = redis_client()
        await client.ping()
        yield client
        await client.close()
    except Exception as exc:  # pragma: no cover - skip when Redis absent
        pytest.skip(f"Redis unavailable: {exc}")


@pytest_asyncio.fixture
async def queue(redis_connection):
    stream = f"test-stream:{uuid.uuid4().hex}"
    service = RedisMessageQueueService(redis_connection, stream_name=stream)
    try:
        yield service
    finally:
        await redis_connection.delete(stream)


@pytest.mark.asyncio
async def test_enqueue_dequeue(queue: RedisMessageQueueService):
    tx_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    await queue.enqueue_transaction(tx_id, tenant_id, priority=1)

    message = await queue.dequeue_transaction("test-group", "worker-1")
    assert message is not None
    assert message["transaction_id"] == tx_id
    assert message["tenant_id"] == tenant_id
    assert message["priority"] == 1
    await queue.acknowledge_transaction("test-group", message["message_id"])
