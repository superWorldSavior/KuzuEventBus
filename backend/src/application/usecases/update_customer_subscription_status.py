from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.ports import CustomerAccountRepository, CacheService, EventService
from src.domain.shared.value_objects import EntityId


@dataclass(frozen=True)
class UpdateCustomerSubscriptionStatusRequest:
    customer_id: UUID
    new_status: str  # "active" or "suspended"


class UpdateCustomerSubscriptionStatusUseCase:
    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        cache_service: CacheService,
        notification_service: EventService,
    ) -> None:
        self._accounts = account_repository
        self._cache = cache_service
        self._events = notification_service

    async def execute(self, req: UpdateCustomerSubscriptionStatusRequest) -> bool:
        account = await self._accounts.find_by_id(EntityId(req.customer_id))
        if not account:
            return False

        updated = False
        if req.new_status == "suspended":
            account.suspend_account("Administrative action")
            updated = True
        elif req.new_status == "active" and account.status.value == "suspended":
            account.reactivate_account()
            updated = True

        if not updated:
            return True  # no-op but considered successful

        await self._accounts.save(account)
        await self._cache.delete(f"account:{req.customer_id}")
        await self._events.emit_event(
            tenant_id=req.customer_id,
            event_type="subscription_updated",
            title="Subscription Status Updated",
            message=f"Your subscription status has been updated to: {req.new_status}",
        )
        return True
