from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.ports import AuthenticationService, CustomerAccountRepository
from src.domain.shared.value_objects import EntityId


@dataclass(frozen=True)
class RevokeCustomerApiKeyRequest:
    customer_id: UUID
    api_key: str


class RevokeCustomerApiKeyUseCase:
    def __init__(self, account_repository: CustomerAccountRepository, auth_service: AuthenticationService) -> None:
        self._accounts = account_repository
        self._auth = auth_service

    async def execute(self, req: RevokeCustomerApiKeyRequest) -> bool:
        # Verify account exists
        account = await self._accounts.find_by_id(EntityId(req.customer_id))
        if not account:
            return False
        # Revoke key via auth service
        success = await self._auth.revoke_api_key(req.api_key)
        if success and account.api_key.value == req.api_key and account.api_key.is_active:
            account.api_key.deactivate()
            await self._accounts.save(account)
        return success

