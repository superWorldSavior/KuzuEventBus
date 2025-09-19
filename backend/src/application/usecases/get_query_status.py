from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, CacheService, TransactionRepository


@dataclass(frozen=True)
class GetQueryStatusRequest:
    tenant_id: UUID
    transaction_id: UUID


class GetQueryStatusUseCase:
    def __init__(self, authz: AuthorizationService, cache: CacheService, transactions: TransactionRepository) -> None:
        self._authz = authz
        self._cache = cache
        self._tx = transactions

    async def execute(self, req: GetQueryStatusRequest) -> Optional[Dict[str, Any]]:
        allowed = await self._authz.check_permission(tenant_id=req.tenant_id, resource="query", action="read")
        if not allowed:
            raise PermissionError("Not authorized to read query status")

        cache_key = f"tx_status:{req.transaction_id}"
        cached = await self._cache.get(cache_key)
        if cached and cached.get("tenant_id") == str(req.tenant_id):
            return cached

        tx = await self._tx.find_by_id(req.transaction_id)
        if not tx:
            return None
        if tx.get("tenant_id") != str(req.tenant_id):
            raise PermissionError("Transaction does not belong to tenant")

        await self._cache.set(key=cache_key, value=tx, expire_seconds=60)
        return tx
