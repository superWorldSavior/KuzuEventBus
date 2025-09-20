from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, CacheService, TransactionRepository, TransactionStatus


@dataclass(frozen=True)
class GetQueryResultsRequest:
    tenant_id: UUID
    transaction_id: UUID


class GetQueryResultsUseCase:
    """
    Retrieve results of a completed async query.

    Notes:
    - We rely on cached results (e.g. produced by the worker) under key: tx_results:{transaction_id}.
    - If absent, we return None to keep the contract minimal (no direct backend fetch required).
    """

    def __init__(self, authz: AuthorizationService, cache: CacheService, transactions: TransactionRepository) -> None:
        self._authz = authz
        self._cache = cache
        self._tx = transactions

    async def execute(self, req: GetQueryResultsRequest) -> Optional[Dict[str, Any]]:
        allowed = await self._authz.check_permission(tenant_id=req.tenant_id, resource="query", action="read")
        if not allowed:
            raise PermissionError("Not authorized to read query results")

        # Ensure transaction belongs to tenant and is completed
        tx = await self._tx.find_by_id(req.transaction_id)
        if not tx:
            return None
        if tx.get("tenant_id") != str(req.tenant_id):
            raise PermissionError("Transaction does not belong to tenant")
        if tx.get("status") != TransactionStatus.COMPLETED.value:
            raise ValueError(f"Query not completed. Status: {tx.get('status')}")

        # Try cache first
        cache_key = f"tx_results:{req.transaction_id}"
        cached = await self._cache.get(cache_key)
        return cached
