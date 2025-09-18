"""
Test cache service implementation.
"""
import pytest

from src.infrastructure.memory.cache_service import InMemoryCacheService


class TestInMemoryCacheService:
    """Test in-memory cache service."""

    @pytest.fixture
    def cache_service(self):
        return InMemoryCacheService()

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache_service):
        """Should set and get values."""
        await cache_service.set("test_key", "test_value")
        value = await cache_service.get("test_key")
        assert value == "test_value"

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, cache_service):
        """Should return None for nonexistent key."""
        value = await cache_service.get("nonexistent")
        assert value is None

    @pytest.mark.asyncio
    async def test_delete(self, cache_service):
        """Should delete keys."""
        await cache_service.set("test_key", "test_value")
        await cache_service.delete("test_key")
        value = await cache_service.get("test_key")
        assert value is None

    @pytest.mark.asyncio
    async def test_exists(self, cache_service):
        """Should check key existence."""
        assert not await cache_service.exists("test_key")
        
        await cache_service.set("test_key", "test_value")
        assert await cache_service.exists("test_key")