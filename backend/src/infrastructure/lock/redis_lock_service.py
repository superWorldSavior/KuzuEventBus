"""Redis-backed distributed lock implementation."""
from __future__ import annotations

import secrets

from redis.asyncio import Redis

from src.domain.shared.ports.query_execution import DistributedLockService


class RedisDistributedLockService(DistributedLockService):
    """Distributed lock built on Redis SET NX/PX semantics."""

    _RELEASE_SCRIPT = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """

    def __init__(self, redis: Redis, prefix: str = "lock:") -> None:
        self._redis = redis
        self._prefix = prefix

    def _key(self, resource: str) -> str:
        return f"{self._prefix}{resource}"

    async def acquire_lock(
        self, resource: str, timeout_seconds: int = 10
    ) -> str | None:
        token = secrets.token_urlsafe(16)
        acquired = await self._redis.set(
            self._key(resource), token, nx=True, ex=timeout_seconds
        )
        return token if acquired else None

    async def release_lock(self, resource: str, token: str) -> bool:
        result = await self._redis.eval(
            self._RELEASE_SCRIPT,
            numkeys=1,
            keys=[self._key(resource)],
            args=[token],
        )
        return result == 1

    async def extend_lock(
        self, resource: str, token: str, extend_seconds: int
    ) -> bool:
        key = self._key(resource)
        current_value = await self._redis.get(key)
        if current_value != token:
            return False
        ttl = await self._redis.ttl(key)
        if ttl is None or ttl < 0:
            ttl = 0
        return bool(await self._redis.expire(key, ttl + extend_seconds))
