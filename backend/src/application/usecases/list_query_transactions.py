from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, TransactionRepository


@dataclass(frozen=True)
class ListQueryTransactionsRequest:
    tenant_id: UUID
    limit: int = 50
    offset: int = 0


class ListQueryTransactionsUseCase:
    def __init__(self, authz: AuthorizationService, transactions: TransactionRepository) -> None:
        self._authz = authz
        self._tx = transactions

    async def execute(self, req: ListQueryTransactionsRequest) -> List[Dict[str, Any]]:
        allowed = await self._authz.check_permission(tenant_id=req.tenant_id, resource="query", action="list")
        if not allowed:
            raise PermissionError("Not authorized to list transactions")
        return await self._tx.find_by_tenant(tenant_id=req.tenant_id, limit=req.limit, offset=req.offset)
