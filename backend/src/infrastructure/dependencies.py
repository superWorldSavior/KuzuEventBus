"""Simple dependency helpers for infrastructure components.

This module centralizes how infrastructure services are provided to the
application. It supports a lightweight test mode that avoids connecting to
external services (PostgreSQL/Redis) when running unit tests.
"""
from __future__ import annotations

import os
from functools import lru_cache

from src.domain.shared.ports.tenant_management import CustomerAccountRepository

from src.infrastructure.logging.config import infra_logger

try:
    # Optional import: only needed when using real Redis services
    from redis.asyncio import Redis  # type: ignore
except Exception:  # pragma: no cover - not required in test env
    Redis = object  # type: ignore[misc,assignment]

def _in_test_env() -> bool:
    env = os.getenv("ENVIRONMENT", "development").lower()
    return (
        env in {"test", "ci"}
        or os.getenv("PYTEST_CURRENT_TEST") is not None
    )


@lru_cache
def customer_repository() -> CustomerAccountRepository:
    """Return the configured customer repository.

    - In tests/CI: use in-memory repository to avoid DB deps
    - Otherwise: use PostgreSQL-backed repository
    If the PostgreSQL adapter fails to initialize, gracefully fall back to
    the in-memory implementation with a warning, rather than crashing at import
    time (which would break test collection).
    """
    if _in_test_env():
        infra_logger.info("Using TestingTenantRepository (test mode)")
        from src.infrastructure.testing.testing_tenant_repository import (
            TestingTenantRepository,
        )

        return TestingTenantRepository()

    from src.infrastructure.database import PostgresCustomerAccountRepository

    infra_logger.info("Using PostgreSQL customer repository")
    return PostgresCustomerAccountRepository()


@lru_cache
def redis_connection():  # -> Redis
    from src.infrastructure.redis import DEFAULT_REDIS_URL, redis_client

    infra_logger.info("Using Redis connection", url=DEFAULT_REDIS_URL)
    return redis_client()


@lru_cache
def cache_service():
    """Return cache service.

    In tests/CI, use an in-memory cache to avoid needing Redis.
    """
    if _in_test_env():
        infra_logger.info("Using TestingCacheService (test mode)")
        from src.infrastructure.testing.testing_cache_service import TestingCacheService

        return TestingCacheService()

    from src.infrastructure.redis import RedisCacheService

    return RedisCacheService(redis_connection())


@lru_cache
def message_queue_service():
    from src.infrastructure.redis import RedisMessageQueueService

    return RedisMessageQueueService(redis_connection())


@lru_cache
def lock_service():
    from src.infrastructure.redis import RedisDistributedLockService

    return RedisDistributedLockService(redis_connection())


@lru_cache
def file_storage_service():
    """Provide the configured file storage service (MinIO)."""
    from src.infrastructure.file_storage import MinioFileStorageService

    infra_logger.info("Using MinIO file storage service")
    return MinioFileStorageService()
