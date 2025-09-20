from __future__ import annotations

import pytest
from uuid import uuid4
from datetime import datetime

from src.infrastructure.auth.authorization_service import AllowAllAuthorizationService


@pytest.mark.asyncio
async def test_allow_all_permission():
    svc = AllowAllAuthorizationService()
    assert await svc.check_permission(uuid4(), "database", "create") is True
    assert await svc.check_permission(uuid4(), "database", "read") is True


@pytest.mark.asyncio
async def test_allow_all_quota_and_rate_limit():
    svc = AllowAllAuthorizationService()
    q = await svc.check_quota(uuid4(), "databases", 1)
    assert q.get("allowed") is True
    assert q.get("limit") >= 1

    rl = await svc.check_rate_limit(uuid4(), "/api/v1/databases/")
    assert rl.get("allowed") is True
    assert isinstance(rl.get("reset_time"), datetime)
