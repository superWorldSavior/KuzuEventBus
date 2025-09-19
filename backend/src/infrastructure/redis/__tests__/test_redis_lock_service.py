"""Integration tests for RedisDistributedLockService."""
from __future__ import annotations

import asyncio

import pytest

from src.infrastructure.redis import RedisDistributedLockService, redis_client


@pytest.fixture(scope="module")
def redis_connection():
    try:
        client = redis_client()
        asyncio.run(client.ping())
        return client
    except Exception as exc:  # pragma: no cover - skip when Redis absent
        pytest.skip(f"Redis unavailable: {exc}")


@pytest.fixture
async def lock_service(redis_connection):
    return RedisDistributedLockService(redis_connection, prefix="test-lock:")


@pytest.mark.asyncio
async def test_lock_cycle(lock_service: RedisDistributedLockService):
    token = await lock_service.acquire_lock("resource", timeout_seconds=2)
    assert token is not None

    assert await lock_service.acquire_lock("resource") is None
    assert await lock_service.extend_lock("resource", token, extend_seconds=2)
    assert await lock_service.release_lock("resource", token)
    assert await lock_service.acquire_lock("resource") is not None
