import os
import asyncio
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.presentation.api.main import app
from src.infrastructure.dependencies import customer_repository
from src.domain.shared.value_objects import EmailAddress, EntityId, TenantName
from src.domain.tenant_management.customer_account import (
    CustomerAccount,
    CustomerAccountStatus,
    ApiKey,
)


@pytest.fixture(autouse=True)
def _set_kuzu_dir(tmp_path, monkeypatch):
    # Ensure Kuzu adapter has a data dir
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))


def _provision_customer():
    repo = customer_repository()
    account = CustomerAccount(
        id=EntityId(uuid4()),
        name=TenantName(f"tenant-{uuid4().hex[:6]}"),
        email=EmailAddress("test@example.com"),
        status=CustomerAccountStatus.ACTIVE,
        api_key=ApiKey.generate(),
    )
    asyncio.run(repo.save(account))
    return account


def test_query_requires_auth():
    client = TestClient(app)
    database_id = uuid4()
    response = client.post(
        f"/api/v1/databases/{database_id}/query",
        json={"query": "MATCH (n) RETURN n", "parameters": {}, "timeout_seconds": 1},
    )
    assert response.status_code == 401
    assert response.json()["detail"] in {"Authorization header required", "Authentication required"}


def test_query_with_invalid_token():
    client = TestClient(app)
    database_id = uuid4()
    response = client.post(
        f"/api/v1/databases/{database_id}/query",
        headers={"Authorization": "Bearer kb_invalid"},
        json={"query": "MATCH (n) RETURN n", "parameters": {}, "timeout_seconds": 1},
    )
    assert response.status_code == 401


def test_query_with_valid_token():
    customer = _provision_customer()
    client = TestClient(app)
    database_id = uuid4()
    response = client.post(
        f"/api/v1/databases/{database_id}/query",
        headers={"Authorization": f"Bearer {customer.api_key.value}"},
        json={"query": "MATCH (n) RETURN n", "parameters": {}, "timeout_seconds": 1},
    )
    # Either success 200 or adapter-level handled error but not auth error
    assert response.status_code in (200, 400)
    if response.status_code == 200:
        body = response.json()
        assert "results" in body
        assert "execution_time_ms" in body