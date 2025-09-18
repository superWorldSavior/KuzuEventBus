"""
Cache service port definition.
"""
from typing import Any, Optional, Protocol


class CacheServicePort(Protocol):
    """Port for cache operations."""

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        ...

    async def set(
        self, key: str, value: Any, expire_seconds: Optional[int] = None
    ) -> None:
        """Set value in cache with optional expiration."""
        ...

    async def delete(self, key: str) -> None:
        """Delete key from cache."""
        ...

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        ...