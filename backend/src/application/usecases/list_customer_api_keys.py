from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict
from uuid import UUID

from src.domain.shared.ports import AuthenticationService, CustomerAccountRepository
from src.domain.shared.value_objects import EntityId


@dataclass(frozen=True)
class ListCustomerApiKeysRequest:
    customer_id: UUID


class ListCustomerApiKeysUseCase:
    def __init__(self, account_repository: CustomerAccountRepository, auth_service: AuthenticationService) -> None:
        self._accounts = account_repository
        self._auth = auth_service

    async def execute(self, req: ListCustomerApiKeysRequest) -> List[Dict[str, str]]:
        # Ensure account exists
        account = await self._accounts.find_by_id(EntityId(req.customer_id))
        if not account:
            raise ValueError(f"Customer {req.customer_id} not found")
        # Delegate to auth service
        return await self._auth.list_api_keys(req.customer_id)
