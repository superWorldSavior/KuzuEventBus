from __future__ import annotations

from dataclasses import dataclass
from typing import List
from uuid import UUID

from src.domain.shared.ports import AuthenticationService, CustomerAccountRepository, EventService
from src.domain.shared.value_objects import EntityId
from src.domain.tenant_management.customer_account import CustomerAccountStatus


@dataclass(frozen=True)
class CreateCustomerApiKeyRequest:
    customer_id: UUID
    key_name: str
    permissions: List[str]


class CreateCustomerApiKeyUseCase:
    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        auth_service: AuthenticationService,
        event_service: EventService,
    ) -> None:
        self._accounts = account_repository
        self._auth = auth_service
        self._events = event_service

    async def execute(self, req: CreateCustomerApiKeyRequest) -> str:
        account = await self._accounts.find_by_id(EntityId(req.customer_id))
        if not account:
            raise ValueError(f"Customer {req.customer_id} not found")
        if account.status != CustomerAccountStatus.ACTIVE:
            raise ValueError("Account is not active")

        api_key = await self._auth.generate_api_key(
            tenant_id=req.customer_id,
            key_name=req.key_name,
            permissions=req.permissions,
        )

        await self._events.emit_event(
            tenant_id=req.customer_id,
            notification_type="api_key_created",
            title="New API Key Created",
            message=(
                f"API key '{req.key_name}' has been created with {len(req.permissions)} permissions"
            ),
        )
        return api_key
