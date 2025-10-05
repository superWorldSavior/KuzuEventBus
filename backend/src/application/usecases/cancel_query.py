from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.ports import (
    AuthorizationService,
    CacheService,
    DistributedLockService,
    EventService,
    TransactionRepository,
    TransactionStatus,
)


@dataclass(frozen=True)
class CancelQueryRequest:
    tenant_id: UUID
    transaction_id: UUID


class CancelQueryUseCase:
    def __init__(
        self,
        authz: AuthorizationService,
        locks: DistributedLockService,
        transactions: TransactionRepository,
        cache: CacheService,
        notifications: EventService,
    ) -> None:
        self._authz = authz
        self._locks = locks
        self._tx = transactions
        self._cache = cache
        self._events = notifications

    async def execute(self, req: CancelQueryRequest) -> bool:
        allowed = await self._authz.check_permission(
            tenant_id=req.tenant_id, resource="query", action="cancel"
        )
        if not allowed:
            raise PermissionError("Not authorized to cancel queries")

        tx = await self._tx.find_by_id(req.transaction_id)
        if not tx or tx.get("tenant_id") != str(req.tenant_id):
            return False

        status = tx.get("status")
        if status not in (TransactionStatus.PENDING.value, TransactionStatus.RUNNING.value):
            return False

        resource = f"transaction:{req.transaction_id}"
        token = await self._locks.acquire_lock(resource, timeout_seconds=5)
        if not token:
            raise RuntimeError("Could not acquire lock for transaction")

        try:
            # If underlying engine supports cancellation, it would be invoked here.
            await self._tx.update_status(
                transaction_id=req.transaction_id,
                status=TransactionStatus.FAILED,
                error_message="Cancelled by user",
            )
            await self._cache.delete(f"tx_status:{req.transaction_id}")
            await self._cache.delete(f"tx_results:{req.transaction_id}")
            await self._events.emit_event(
                tenant_id=req.tenant_id,
                event_type="query_cancelled",
                title="Query Cancelled",
                message="Query execution has been cancelled",
                metadata={"transaction_id": str(req.transaction_id)},
            )
            return True
        finally:
            await self._locks.release_lock(resource, token)
