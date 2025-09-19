from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, CacheService, TransactionRepository, TransactionStatus


@dataclass(frozen=True)
class GetQueryStatisticsRequest:
    tenant_id: UUID


class GetQueryStatisticsUseCase:
    def __init__(self, authz: AuthorizationService, cache: CacheService, transactions: TransactionRepository) -> None:
        self._authz = authz
        self._cache = cache
        self._tx = transactions

    async def execute(self, req: GetQueryStatisticsRequest) -> Dict[str, Any]:
        allowed = await self._authz.check_permission(tenant_id=req.tenant_id, resource="query", action="read")
        if not allowed:
            raise PermissionError("Not authorized to read statistics")

        cache_key = f"stats:{req.tenant_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        transactions = await self._tx.find_by_tenant(tenant_id=req.tenant_id, limit=1000)

        total = len(transactions)
        completed = sum(1 for tx in transactions if tx.get("status") == TransactionStatus.COMPLETED.value)
        failed = sum(1 for tx in transactions if tx.get("status") == TransactionStatus.FAILED.value)
        pending = sum(1 for tx in transactions if tx.get("status") == TransactionStatus.PENDING.value)
        running = sum(1 for tx in transactions if tx.get("status") == TransactionStatus.RUNNING.value)

        # Average execution time for completed queries
        exec_times = []
        for tx in transactions:
            if tx.get("status") == TransactionStatus.COMPLETED.value and tx.get("completed_at") and tx.get("started_at"):
                try:
                    start = datetime.fromisoformat(tx["started_at"])  # type: ignore[arg-type]
                    end = datetime.fromisoformat(tx["completed_at"])  # type: ignore[arg-type]
                    exec_times.append((end - start).total_seconds())
                except Exception:
                    continue
        avg_exec = round(sum(exec_times) / len(exec_times), 2) if exec_times else 0

        stats: Dict[str, Any] = {
            "total_queries": total,
            "completed": completed,
            "failed": failed,
            "pending": pending,
            "running": running,
            "success_rate": (completed / total * 100) if total > 0 else 0,
            "average_execution_time_seconds": avg_exec,
            "calculated_at": datetime.utcnow().isoformat(),
        }

        await self._cache.set(key=cache_key, value=stats, expire_seconds=300)
        return stats
