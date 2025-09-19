"""
In-memory cache service.
YAGNI implementation - simple dictionary cache with no expiration logic.
"""
from typing import Any, Dict, Optional

from src.domain.shared.ports.cache import CacheService


class InMemoryCacheService(CacheService):
    """Simple in-memory cache using dictionary."""

    def __init__(self):
        self._cache: Dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        return self._cache.get(key)

    async def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        """Set value in cache. Ignores expiration for simplicity."""
        self._cache[key] = value
        return True

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        self._cache.pop(key, None)
        return True

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        return key in self._cache