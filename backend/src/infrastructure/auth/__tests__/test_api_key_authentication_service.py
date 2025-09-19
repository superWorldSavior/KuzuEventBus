from uuid import uuid4
import pytest

from src.infrastructure.auth.api_key_authentication_service import (
    ApiKeyAuthenticationService,
)


@pytest.mark.asyncio
async def test_generate_and_validate_api_key():
    service = ApiKeyAuthenticationService()
    tenant_id = uuid4()
    key = await service.generate_api_key(tenant_id, "default", ["query:execute"])
    assert key.startswith("kb_")
    meta = await service.validate_api_key(key)
    assert meta is not None
    assert meta["tenant_id"] == tenant_id
    assert meta["active"] is True


@pytest.mark.asyncio
async def test_revoke_api_key():
    service = ApiKeyAuthenticationService()
    tid = uuid4()
    key = await service.generate_api_key(tid, "rot", [])
    assert await service.revoke_api_key(key) is True
    # idempotent second revoke
    assert await service.revoke_api_key(key) is False
    assert await service.validate_api_key(key) is None


@pytest.mark.asyncio
async def test_list_api_keys_filters_by_tenant():
    service = ApiKeyAuthenticationService()
    tid1 = uuid4()
    tid2 = uuid4()
    key1 = await service.generate_api_key(tid1, "k1", [])
    key2 = await service.generate_api_key(tid2, "k2", [])
    keys_tid1 = await service.list_api_keys(tid1)
    assert any(k["api_key"] == key1 for k in keys_tid1)
    assert not any(k["api_key"] == key2 for k in keys_tid1)
