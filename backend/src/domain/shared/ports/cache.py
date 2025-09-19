"""Canonical cache service protocol (extracted from query_execution)."""
from typing import Any, Optional, Protocol, runtime_checkable


@runtime_checkable
class CacheService(Protocol):
    """Protocol for caching operations (Redis or in-memory)."""

    async def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool | None:
        """Set cache value with optional expiration. Return True/None for success."""
        ...

    async def get(self, key: str) -> Optional[Any]:
        """Get cached value."""
        ...

    async def delete(self, key: str) -> bool | None:
        """Delete cache entry. Return True/None for success."""
        ...

    async def exists(self, key: str) -> bool:
        """Check if cache key exists."""
        ...