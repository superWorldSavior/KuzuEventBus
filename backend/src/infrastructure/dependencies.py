"""Simple dependency helpers for infrastructure components."""
from __future__ import annotations

from functools import lru_cache

from src.domain.shared.ports.tenant_management import CustomerAccountRepository
from src.infrastructure.logging.config import infra_logger


@lru_cache
def customer_repository() -> CustomerAccountRepository:
    """Return the configured customer repository (persistent by default)."""
    from src.infrastructure.database import PostgresCustomerAccountRepository

    infra_logger.info("Using PostgreSQL customer repository")
    return PostgresCustomerAccountRepository()
