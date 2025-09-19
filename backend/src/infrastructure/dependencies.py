"""Simple dependency helpers for infrastructure components.

This module centralizes how infrastructure services are provided to the
application. It supports a lightweight test mode that avoids connecting to
external services (PostgreSQL/Redis) when running unit tests.
"""
from __future__ import annotations

import os
from functools import lru_cache

from src.domain.shared.ports.tenant_management import CustomerAccountRepository
from src.domain.shared.ports.authentication import AuthenticationService
from src.domain.shared.ports.notifications import NotificationService

from src.infrastructure.logging.config import infra_logger

try:
    # Optional import: only needed when using real Redis services
    from redis.asyncio import Redis  # type: ignore
except Exception:  # pragma: no cover - not required in test env
    Redis = object  # type: ignore[misc,assignment]

def _in_test_env() -> bool:  # retained only if future conditional logic needed
    env = os.getenv("ENVIRONMENT", "development").lower()
    return env in {"test", "ci"} or os.getenv("PYTEST_CURRENT_TEST") is not None


@lru_cache
def customer_repository() -> CustomerAccountRepository:
    """Return the configured customer repository.

    - In tests/CI: use in-memory repository to avoid DB deps
    - Otherwise: use PostgreSQL-backed repository
    If the PostgreSQL adapter fails to initialize, gracefully fall back to
    the in-memory implementation with a warning, rather than crashing at import
    time (which would break test collection).
    """
    from src.infrastructure.database import PostgresCustomerAccountRepository

    infra_logger.info("Using PostgreSQL customer repository (no in-memory fallback)")
    return PostgresCustomerAccountRepository()


def redis_connection():  # -> Redis
    from src.infrastructure.redis import DEFAULT_REDIS_URL, redis_client

    infra_logger.info("Using Redis connection", url=DEFAULT_REDIS_URL)
    return redis_client()


def cache_service():
    from src.infrastructure.redis import RedisCacheService

    return RedisCacheService(redis_connection())


def message_queue_service():
    from src.infrastructure.redis import RedisMessageQueueService

    return RedisMessageQueueService(redis_connection())


def lock_service():
    from src.infrastructure.redis import RedisDistributedLockService

    return RedisDistributedLockService(redis_connection())


def transaction_repository():
    """Provide transaction repository (Redis-backed).

    Stores job status/results for async query execution.
    """
    from src.infrastructure.transactions.redis_transaction_repository import (
        RedisTransactionRepository,
    )

    return RedisTransactionRepository(redis_connection())


@lru_cache
def file_storage_service():
    """Provide the configured file storage service (MinIO)."""
    from src.infrastructure.file_storage import MinioFileStorageService

    infra_logger.info("Using MinIO file storage service")
    return MinioFileStorageService()


@lru_cache
def auth_service() -> AuthenticationService:
    """Provide authentication service implementation.

    In-memory API key store for MVP. Replaced later transparently.
    """
    from src.infrastructure.auth.api_key_authentication_service import (
        ApiKeyAuthenticationService,
    )

    infra_logger.info("Using ApiKeyAuthenticationService (in-memory MVP)")
    return ApiKeyAuthenticationService()


@lru_cache
def notification_service() -> NotificationService:
    """Provide notification delivery service (logging + memory)."""
    from src.infrastructure.notifications.logging_notification_service import (
        LoggingNotificationService,
    )

    infra_logger.info("Using LoggingNotificationService (in-memory MVP)")
    return LoggingNotificationService()
