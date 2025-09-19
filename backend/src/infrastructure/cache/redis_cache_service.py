"""Redis-backed cache implementation."""
from __future__ import annotations

import json
from typing import Any, Optional

from redis.asyncio import Redis

from src.domain.shared.ports.cache import CacheService


class RedisCacheService(CacheService):
    """Implementation of CacheService using Redis key/value semantics."""

    def __init__(self, redis: Redis, prefix: str = "cache:") -> None:
        self._redis = redis
        self._prefix = prefix

    def _key(self, key: str) -> str:
        return f"{self._prefix}{key}"

    async def set(
        self, key: str, value: Any, expire_seconds: Optional[int] = None
    ) -> bool:
        payload = json.dumps(value, default=str)
        await self._redis.set(self._key(key), payload, ex=expire_seconds)
        return True

    async def get(self, key: str) -> Optional[Any]:
        raw = await self._redis.get(self._key(key))
        if raw is None:
            return None
        return json.loads(raw)

    async def delete(self, key: str) -> bool:
        await self._redis.delete(self._key(key))
        return True

    async def exists(self, key: str) -> bool:
        return bool(await self._redis.exists(self._key(key)))
