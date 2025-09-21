"""PostgreSQL-backed customer account repository."""
from __future__ import annotations

import asyncio
from typing import Callable, List, Optional, TypeVar, Union
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import SQLAlchemyError

from src.domain.shared.ports.tenant_management import CustomerAccountRepository
from src.domain.shared.value_objects import EmailAddress, EntityId, StorageSize, StorageUnit, TenantName
from src.domain.tenant_management.customer_account import (
    ApiKey,
    CustomerAccount,
    CustomerAccountStatus,
    SubscriptionDetails,
    SubscriptionPlan,
)

from .models import Base, CustomerAccountModel
from .session import SessionFactory, get_engine

T = TypeVar("T")


class PostgresCustomerAccountRepository(CustomerAccountRepository):
    """Customer account persistence layer using PostgreSQL."""

    def __init__(self) -> None:
        engine = get_engine()
        Base.metadata.create_all(bind=engine)

    async def save(self, account: CustomerAccount) -> CustomerAccount:
        model = await self._run(self._upsert_model, account)
        return self._model_to_domain(model)

    async def find_by_id(self, account_id: Union[UUID, EntityId]) -> Optional[CustomerAccount]:
        normalized_id = self._normalize_id(account_id)
        model = await self._run(
            self._select_one,
            select(CustomerAccountModel).where(CustomerAccountModel.customer_id == normalized_id),
        )
        return self._model_to_domain(model) if model else None

    async def find_by_email(self, email: str) -> Optional[CustomerAccount]:
        normalized = EmailAddress(email).value
        model = await self._run(
            self._select_one,
            select(CustomerAccountModel).where(CustomerAccountModel.admin_email == normalized),
        )
        return self._model_to_domain(model) if model else None

    async def find_by_api_key(self, api_key: str) -> Optional[CustomerAccount]:
        model = await self._run(
            self._select_one,
            select(CustomerAccountModel).where(CustomerAccountModel.api_key == api_key),
        )
        return self._model_to_domain(model) if model else None

    async def find_all(self, limit: int = 100, offset: int = 0) -> List[CustomerAccount]:
        models = await self._run(
            self._select_many,
            select(CustomerAccountModel).offset(offset).limit(limit).order_by(CustomerAccountModel.created_at.desc()),
        )
        return [self._model_to_domain(model) for model in models]

    async def delete(self, account_id: Union[UUID, EntityId]) -> bool:
        normalized_id = self._normalize_id(account_id)
        return await self._run(self._delete_account, normalized_id)

    async def count_total(self) -> int:
        return await self._run(self._count_accounts)

    async def find_by_tenant_name(self, tenant_name: TenantName) -> Optional[CustomerAccount]:
        model = await self._run(
            self._select_one,
            select(CustomerAccountModel).where(CustomerAccountModel.tenant_name == tenant_name.value),
        )
        return self._model_to_domain(model) if model else None

    async def exists_by_tenant_name(self, tenant_name: TenantName) -> bool:
        count = await self._run(
            self._count_matching,
            select(func.count()).select_from(CustomerAccountModel).where(CustomerAccountModel.tenant_name == tenant_name.value),
        )
        return count > 0

    async def list_all_customers(self) -> List[CustomerAccount]:
        models = await self._run(self._select_many, select(CustomerAccountModel))
        return [self._model_to_domain(model) for model in models]

    async def _run(self, operation: Callable[..., T], *args) -> T:
        try:
            return await asyncio.to_thread(operation, *args)
        except SQLAlchemyError as exc:  # noqa: BLE001
            raise RuntimeError(f"Database operation failed: {exc}") from exc

    def _upsert_model(self, account: CustomerAccount) -> CustomerAccountModel:
        with SessionFactory() as session:
            existing = session.get(CustomerAccountModel, account.id.value)
            if existing is None:
                existing = CustomerAccountModel(customer_id=account.id.value)
                session.add(existing)
            self._populate_model(existing, account)
            session.commit()
            session.refresh(existing)
            return existing

    def _select_one(self, stmt):
        with SessionFactory() as session:
            result = session.execute(stmt).scalar_one_or_none()
            return result

    def _select_many(self, stmt):
        with SessionFactory() as session:
            result = session.execute(stmt).scalars().all()
            return result

    def _delete_account(self, account_id: UUID) -> bool:
        with SessionFactory() as session:
            result = session.execute(delete(CustomerAccountModel).where(CustomerAccountModel.customer_id == account_id))
            session.commit()
            return result.rowcount > 0 if result.rowcount is not None else False

    def _count_accounts(self) -> int:
        with SessionFactory() as session:
            return session.execute(select(func.count()).select_from(CustomerAccountModel)).scalar_one()

    def _count_matching(self, stmt) -> int:
        with SessionFactory() as session:
            return session.execute(stmt).scalar_one()

    def _populate_model(self, model: CustomerAccountModel, account: CustomerAccount) -> None:
        model.tenant_name = account.name.value
        model.admin_email = account.email.value
        model.api_key = account.api_key.value
        model.api_key_created_at = account.api_key.created_at
        model.api_key_last_used = account.api_key.last_used
        model.api_key_active = account.api_key.is_active
        model.status = account.status.value
        model.subscription_plan = account.subscription.plan.value
        model.storage_quota_mb = account.subscription.storage_quota.to_megabytes()
        model.max_databases = account.subscription.max_databases
        model.max_concurrent_queries = account.subscription.max_concurrent_queries
        model.subscription_started_at = account.subscription.started_at
        model.subscription_expires_at = account.subscription.expires_at
        model.current_storage_usage_mb = account.current_storage_usage.to_megabytes()
        model.database_count = account.database_count
        model.created_at = account.created_at
        model.updated_at = account.updated_at
        model.last_login = account.last_login
        model.organization_name = getattr(account, "organization_name", None)
        model.password_hash = getattr(account, "password_hash", None)

    def _model_to_domain(self, model: Optional[CustomerAccountModel]) -> Optional[CustomerAccount]:
        if model is None:
            return None

        account = CustomerAccount(
            id=EntityId(model.customer_id),
            name=TenantName(model.tenant_name),
            email=EmailAddress(model.admin_email),
            api_key=ApiKey(
                value=model.api_key,
                created_at=model.api_key_created_at,
                last_used=model.api_key_last_used,
                is_active=model.api_key_active,
            ),
            status=CustomerAccountStatus(model.status),
            subscription=SubscriptionDetails(
                plan=SubscriptionPlan(model.subscription_plan),
                storage_quota=StorageSize(model.storage_quota_mb, StorageUnit.MB),
                max_databases=model.max_databases,
                max_concurrent_queries=model.max_concurrent_queries,
                started_at=model.subscription_started_at,
                expires_at=model.subscription_expires_at,
            ),
            current_storage_usage=StorageSize(model.current_storage_usage_mb, StorageUnit.MB),
            database_count=model.database_count,
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_login=model.last_login,
        )

        if model.organization_name:
            setattr(account, "organization_name", model.organization_name)

        # Propagate password_hash back to domain entity to avoid overwriting with NULL on subsequent saves
        if getattr(model, "password_hash", None):
            setattr(account, "password_hash", model.password_hash)

        account.mark_events_as_committed()
        return account

    def _normalize_id(self, account_id: Union[UUID, EntityId]) -> UUID:
        if isinstance(account_id, EntityId):
            return account_id.value
        return account_id
