from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict
from uuid import UUID, uuid4

from src.domain.shared.ports import (
    AuthenticationService,
    CacheService,
    CustomerAccountRepository,
    NotificationService,
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
        notification_service: NotificationService,
        cache_service: CacheService,
    ) -> None:
        self._account_repository = account_repository
        self._auth_service = auth_service
        self._notification_service = notification_service
        self._cache_service = cache_service

    async def execute(self, req: RegisterCustomerRequest) -> RegisterCustomerResponse:
        # Validate inputs
        tenant_name_vo = TenantName(req.tenant_name)
        admin_email_vo = EmailAddress(req.admin_email)

        # Check if tenant already exists
        existing = await self._account_repository.find_by_tenant_name(tenant_name_vo)
        if existing:
            raise ValueError(f"Tenant '{req.tenant_name}' already exists")

        # Create new customer account
        customer_id = EntityId(uuid4())
        account = CustomerAccount(
            id=customer_id,
            name=tenant_name_vo,
            email=admin_email_vo,
            status=CustomerAccountStatus.ACTIVE,
        )
        setattr(account, "organization_name", req.organization_name)

        # Generate initial API key and attach to account
        raw_key = await self._auth_service.generate_api_key(
            tenant_id=customer_id.value,
            key_name="default",
            permissions=["database:read", "database:write", "query:execute"],
        )
        account.api_key = ApiKey(raw_key)

        # Persist account
        await self._account_repository.save(account)

        # Notify
        await self._notification_service.send_notification(
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
