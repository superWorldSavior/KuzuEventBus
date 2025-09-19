"""Shared Redis client factory."""
from __future__ import annotations

import os

from redis.asyncio import Redis

DEFAULT_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


def redis_client() -> Redis:
    """Return a cached Redis asyncio client."""
    # Do NOT cache the client at module level to avoid reusing a connection
    # across different event loops (pytest creates/tears down loops per test).
    return Redis.from_url(DEFAULT_REDIS_URL, decode_responses=True)
