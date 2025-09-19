from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from src.application.usecases.register_customer import (
    RegisterCustomerUseCase,
    RegisterCustomerRequest,
)
from src.application.usecases.get_customer_details import (
    GetCustomerDetailsUseCase,
    GetCustomerDetailsRequest,
)
from src.application.usecases.create_customer_api_key import (
    CreateCustomerApiKeyUseCase,
    CreateCustomerApiKeyRequest,
)
from src.application.usecases.revoke_customer_api_key import (
    RevokeCustomerApiKeyUseCase,
    RevokeCustomerApiKeyRequest,
)
from src.application.usecases.update_customer_subscription_status import (
    UpdateCustomerSubscriptionStatusUseCase,
    UpdateCustomerSubscriptionStatusRequest,
)
from src.domain.shared.value_objects import EntityId, TenantName, EmailAddress
from src.domain.tenant_management.customer_account import CustomerAccount, CustomerAccountStatus, ApiKey


@pytest.fixture
def ports():
    return {
        "accounts": AsyncMock(),
        "auth": AsyncMock(),
        "notify": AsyncMock(),
        "cache": AsyncMock(),
    }


@pytest.mark.asyncio
async def test_register_customer_success(ports):
    uc = RegisterCustomerUseCase(
        account_repository=ports["accounts"],
        auth_service=ports["auth"],
        notification_service=ports["notify"],
        cache_service=ports["cache"],
    )
    ports["accounts"].find_by_tenant_name.return_value = None
    ports["auth"].generate_api_key.return_value = "kb_" + "a" * 40

    res = await uc.execute(
        RegisterCustomerRequest(
            tenant_name="acme",
            admin_email="admin@acme.com",
            organization_name="Acme Inc",
        )
    )

    assert res.api_key.startswith("kb_")
    ports["accounts"].save.assert_called_once()
    ports["notify"].send_notification.assert_called_once()
    ports["cache"].set.assert_called_once()


@pytest.mark.asyncio
async def test_get_customer_details_cache_then_repo(ports):
    tenant = uuid4()
    # Cache hit
    ports["cache"].get.return_value = {"customer_id": str(tenant), "tenant_name": "tenant-abc"}
    uc = GetCustomerDetailsUseCase(ports["accounts"], ports["cache"])
    r1 = await uc.execute(GetCustomerDetailsRequest(customer_id=tenant))
    assert r1["customer_id"] == str(tenant)
    ports["accounts"].find_by_id.assert_not_called()

    # Cache miss
    ports["cache"].get.return_value = None
    account = MagicMock()
    account.id = EntityId(tenant)
    account.name = TenantName("tenant-abc")
    account.email = EmailAddress("a@b.com")
    account.status = CustomerAccountStatus.ACTIVE
    account.created_at = __import__("datetime").datetime.utcnow()
    account.last_login = None
    ports["accounts"].find_by_id.return_value = account
    r2 = await uc.execute(GetCustomerDetailsRequest(customer_id=tenant))
    assert r2["tenant_name"] == "tenant-abc"
    ports["cache"].set.assert_called()


@pytest.mark.asyncio
async def test_create_customer_api_key_paths(ports):
    tenant = uuid4()
    # Active
    ports["accounts"].find_by_id.return_value = MagicMock(status=CustomerAccountStatus.ACTIVE)
    ports["auth"].generate_api_key.return_value = "kb_" + "a" * 40
    uc = CreateCustomerApiKeyUseCase(ports["accounts"], ports["auth"], ports["notify"])
    r = await uc.execute(CreateCustomerApiKeyRequest(customer_id=tenant, key_name="prod", permissions=["q"]))
    assert r.startswith("kb_") and len(r) >= 10
    ports["notify"].send_notification.assert_called_once()

    # Inactive
    ports["accounts"].find_by_id.return_value = MagicMock(status=CustomerAccountStatus.SUSPENDED)
    with pytest.raises(ValueError):
        await uc.execute(CreateCustomerApiKeyRequest(customer_id=tenant, key_name="prod", permissions=["q"]))


@pytest.mark.asyncio
async def test_revoke_customer_api_key_success(ports):
    tenant = uuid4()
    acc = MagicMock()
    key_val = "kb_" + "a" * 40
    acc.api_key = ApiKey(key_val)
    ports["accounts"].find_by_id.return_value = acc
    ports["auth"].revoke_api_key.return_value = True
    uc = RevokeCustomerApiKeyUseCase(ports["accounts"], ports["auth"]) 
    ok = await uc.execute(RevokeCustomerApiKeyRequest(customer_id=tenant, api_key=key_val))
    assert ok is True
    ports["accounts"].save.assert_called_once()


@pytest.mark.asyncio
async def test_update_customer_subscription_status_paths(ports):
    tenant = uuid4()
    # Suspend
    ports["accounts"].find_by_id.return_value = MagicMock()
    uc = UpdateCustomerSubscriptionStatusUseCase(ports["accounts"], ports["cache"], ports["notify"])
    ok1 = await uc.execute(UpdateCustomerSubscriptionStatusRequest(customer_id=tenant, new_status="suspended"))
    assert ok1 is True
    ports["cache"].delete.assert_called()

    # Reactivate
    suspended = MagicMock()
    suspended.status.value = "suspended"
    ports["accounts"].find_by_id.return_value = suspended
    ok2 = await uc.execute(UpdateCustomerSubscriptionStatusRequest(customer_id=tenant, new_status="active"))
    assert ok2 is True
