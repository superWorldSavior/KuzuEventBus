"""Integration tests for the PostgreSQL-backed customer account repository.

These tests exercise the real persistence adapter. They require the
DATABASE_URL to point to a reachable PostgreSQL instance. When unavailable
(e.g. during local runs without `docker-compose up postgres`), the tests skip
cleanly.
"""
from __future__ import annotations

import asyncio
import uuid

import pytest
from sqlalchemy.exc import OperationalError

from src.domain.shared.value_objects import EmailAddress, EntityId, TenantName
from src.domain.tenant_management.customer_account import CustomerAccount, CustomerAccountStatus
from src.infrastructure.database.tenant_repository import PostgresCustomerAccountRepository


@pytest.fixture(scope="module")
def repository() -> PostgresCustomerAccountRepository:
    try:
        repo = PostgresCustomerAccountRepository()
        asyncio.run(repo.count_total())
        return repo
    except (RuntimeError, OperationalError) as exc:  # pragma: no cover - skip when DB missing
        pytest.skip(f"PostgreSQL repository unavailable: {exc}")


@pytest.fixture
def sample_account() -> CustomerAccount:
    account = CustomerAccount(
        id=EntityId(uuid.uuid4()),
        name=TenantName(f"tenant-{uuid.uuid4().hex[:8]}"),
        email=EmailAddress(f"admin-{uuid.uuid4().hex[:8]}@example.com"),
        status=CustomerAccountStatus.ACTIVE,
    )
    # Add password_hash for DB constraint
    setattr(account, "password_hash", "test_salt:test_hash")
    return account


@pytest.mark.asyncio
async def test_save_and_find_by_id(repository: PostgresCustomerAccountRepository, sample_account: CustomerAccount) -> None:
    await repository.save(sample_account)
    found = await repository.find_by_id(sample_account.id)
    assert found is not None
    assert found.name.value == sample_account.name.value
    await repository.delete(sample_account.id.value)


@pytest.mark.asyncio
async def test_find_by_tenant_name(repository: PostgresCustomerAccountRepository, sample_account: CustomerAccount) -> None:
    await repository.save(sample_account)
    found = await repository.find_by_tenant_name(sample_account.name)
    assert found is not None
    assert found.email.value == sample_account.email.value
    await repository.delete(sample_account.id.value)


@pytest.mark.asyncio
async def test_exists_by_tenant_name(repository: PostgresCustomerAccountRepository, sample_account: CustomerAccount) -> None:
    exists_before = await repository.exists_by_tenant_name(sample_account.name)
    assert not exists_before

    await repository.save(sample_account)
    exists_after = await repository.exists_by_tenant_name(sample_account.name)
    assert exists_after
    await repository.delete(sample_account.id.value)
