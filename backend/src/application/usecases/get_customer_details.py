from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict, Any
from uuid import UUID

from src.domain.shared.ports import CacheService, CustomerAccountRepository
from src.domain.shared.value_objects import EntityId


@dataclass(frozen=True)
class GetCustomerDetailsRequest:
    customer_id: UUID


class GetCustomerDetailsUseCase:
    def __init__(self, account_repository: CustomerAccountRepository, cache_service: CacheService) -> None:
        self._accounts = account_repository
        self._cache = cache_service

    async def execute(self, req: GetCustomerDetailsRequest) -> Optional[Dict[str, Any]]:
        cache_key = f"account:{req.customer_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        account = await self._accounts.find_by_id(EntityId(req.customer_id))
        if not account:
            return None

        details = {
            "customer_id": str(account.id.value),
            "tenant_name": account.name.value,
            "admin_email": account.email.value,
            "subscription_status": account.status.value,
            "created_at": account.created_at.isoformat(),
            "last_activity": account.last_login.isoformat() if account.last_login else None,
        }
        await self._cache.set(cache_key, details, expire_seconds=3600)
        return details

