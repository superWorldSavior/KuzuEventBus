"""Integration tests for RedisCacheService."""
from __future__ import annotations

import asyncio
import os
import uuid

import pytest

from src.infrastructure.redis import RedisCacheService, redis_client


@pytest.fixture(scope="module")
def redis_connection():
    try:
        client = redis_client()
        asyncio.run(client.ping())
        return client
    except Exception as exc:  # pragma: no cover - skip when Redis absent
        pytest.skip(f"Redis unavailable: {exc}")


@pytest.fixture
async def cache(redis_connection):
    service = RedisCacheService(redis_connection, prefix=f"test-cache:{uuid.uuid4().hex}:")
    yield service
    keys = await redis_connection.keys("test-cache:*")
    if keys:
        await redis_connection.delete(*keys)


@pytest.mark.asyncio
async def test_set_and_get(cache: RedisCacheService):
    await cache.set("foo", {"value": 42}, expire_seconds=5)
    assert await cache.exists("foo")
    result = await cache.get("foo")
    assert result == {"value": 42}


@pytest.mark.asyncio
async def test_delete(cache: RedisCacheService):
    await cache.set("to-delete", "bar")
    await cache.delete("to-delete")
    assert not await cache.exists("to-delete")
