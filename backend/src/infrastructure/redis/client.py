"""Shared Redis client factory."""
from __future__ import annotations

import os
from functools import lru_cache

from redis.asyncio import Redis

DEFAULT_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


@lru_cache
def redis_client() -> Redis:
    """Return a cached Redis asyncio client."""
    return Redis.from_url(DEFAULT_REDIS_URL, decode_responses=True)
