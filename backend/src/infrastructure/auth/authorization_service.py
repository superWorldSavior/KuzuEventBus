"""Authorization service (MVP) implementation.

Allow-all strategy with simple placeholders for rate limits and quotas.
This unblocks use cases that require AuthorizationService while we
iterate on real policies. Fail fast can be added per endpoint later.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from uuid import UUID

from src.domain.shared.ports.authentication import AuthorizationService


class AllowAllAuthorizationService(AuthorizationService):
    async def check_permission(self, tenant_id: UUID, resource: str, action: str) -> bool:
        # MVP: always allow. Add policy rules here when ready.
        return True

    async def check_rate_limit(self, tenant_id: UUID, endpoint: str) -> Dict[str, Any]:
        # MVP: unlimited, next reset in 1 minute
        return {
            "allowed": True,
            "remaining": 1_000_000,
            "reset_time": datetime.now(timezone.utc) + timedelta(minutes=1),
        }

    async def check_quota(self, tenant_id: UUID, resource_type: str, requested_amount: int = 1) -> Dict[str, Any]:
        # MVP: virtually unlimited quotas to unblock flows
        return {
            "allowed": True,
            "used": 0,
            "limit": 1_000_000,
        }
