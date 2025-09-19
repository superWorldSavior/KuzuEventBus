"""Testing cache service (dev/test-only) using in-process dict+TTL."""
from __future__ import annotations

import time
from typing import Any, Optional

from src.domain.shared.ports import CacheService


class TestingCacheService(CacheService):
    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, Optional[float]]] = {}

    async def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        expires_at = time.monotonic() + expire_seconds if expire_seconds else None
        self._store[key] = (value, expires_at)
        return True

    async def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if expires_at is not None and time.monotonic() >= expires_at:
            self._store.pop(key, None)
            return None
        return value

    async def delete(self, key: str) -> bool:
        return self._store.pop(key, None) is not None

    async def exists(self, key: str) -> bool:
        return (await self.get(key)) is not None

