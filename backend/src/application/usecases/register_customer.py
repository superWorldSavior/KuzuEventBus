from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict
from uuid import UUID, uuid4

from src.domain.shared.ports import (
    AuthenticationService,
    CacheService,
    CustomerAccountRepository,
    EventService,
)
from src.domain.shared.ports.database_management import (
    BucketProvisioningService,
    DatabaseProvisioningService,
    DatabaseMetadataRepository,
)
from src.domain.shared.value_objects import EmailAddress, EntityId, TenantName
from src.domain.tenant_management.customer_account import (
    CustomerAccount,
    CustomerAccountStatus,
    ApiKey,
)


@dataclass(frozen=True)
class RegisterCustomerRequest:
    tenant_name: str
    admin_email: str
    organization_name: str
    password: str


@dataclass(frozen=True)
class RegisterCustomerResponse:
    customer_id: UUID
    tenant_name: str
    organization_name: str
    admin_email: str
    api_key: str
    subscription_status: str
    created_at: str


class RegisterCustomerUseCase:
    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        auth_service: AuthenticationService,
        event_service: EventService,
        cache_service: CacheService,
        bucket_service: BucketProvisioningService | None = None,
        database_service: DatabaseProvisioningService | None = None,
        metadata_repository: DatabaseMetadataRepository | None = None,
    ) -> None:
        self._account_repository = account_repository
        self._auth_service = auth_service
        self._event_service = event_service
        self._cache_service = cache_service
        self._bucket_service = bucket_service
        self._database_service = database_service
        self._metadata_repository = metadata_repository

    async def execute(self, req: RegisterCustomerRequest) -> RegisterCustomerResponse:
        # Validate inputs
        tenant_name_vo = TenantName(req.tenant_name)
        admin_email_vo = EmailAddress(req.admin_email)

        # Check if tenant already exists
        existing = await self._account_repository.find_by_tenant_name(tenant_name_vo)
        if existing:
            raise ValueError(f"Tenant '{req.tenant_name}' already exists")

        # Check if email already used
        existing_email = await self._account_repository.find_by_email(admin_email_vo.value)
        if existing_email is not None:
            raise ValueError("Admin email already in use")

        # Create new customer account
        customer_id = EntityId(uuid4())
        account = CustomerAccount(
            id=customer_id,
            name=tenant_name_vo,
            email=admin_email_vo,
            status=CustomerAccountStatus.ACTIVE,
        )
        setattr(account, "organization_name", req.organization_name)

        # Hash password and store
        password_hash = await self._auth_service.hash_password(req.password)
        setattr(account, "password_hash", password_hash)

        # Generate initial API key and attach to account
        raw_key = await self._auth_service.generate_api_key(
            tenant_id=customer_id.value,
            key_name="default",
            permissions=["database:read", "database:write", "query:execute"],
        )
        account.api_key = ApiKey(raw_key)

        # Persist account
        await self._account_repository.save(account)

        # Provision default database if services are provided
        if all([self._bucket_service, self._database_service, self._metadata_repository]):
            try:
                from src.domain.database_management.value_objects import DatabaseName
                
                # Ensure bucket
                await self._bucket_service.ensure_bucket(customer_id.value)
                
                # Create default database
                db_name = DatabaseName("main")
                db_meta = await self._database_service.create_database(customer_id.value, db_name)
                await self._metadata_repository.save(db_meta)
            except Exception as e:  # Don't fail registration if provisioning fails
                # Log but continue - user can create database manually
                pass

        # Notify
        await self._event_service.emit_event(
            tenant_id=customer_id.value,
            notification_type="welcome",
            title="Welcome to Kuzu Event Bus",
            message=(
                f"Your account has been created successfully. Organization: {req.organization_name}"
            ),
        )

        # Cache summary
        cache_key = f"account:{customer_id.value}"
        await self._cache_service.set(
            key=cache_key,
            value={
                "customer_id": str(customer_id.value),
                "tenant_name": req.tenant_name,
                "organization_name": req.organization_name,
                "status": account.status.value,
            },
            expire_seconds=3600,
        )

        return RegisterCustomerResponse(
            customer_id=customer_id.value,
            tenant_name=req.tenant_name,
            organization_name=req.organization_name,
            admin_email=req.admin_email,
            api_key=raw_key,
            subscription_status=account.status.value,
            created_at=account.created_at.isoformat(),
        )
