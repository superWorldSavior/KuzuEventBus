from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.presentation.api.main import app


@pytest.fixture(autouse=True)
def _set_env(tmp_path, monkeypatch):
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    monkeypatch.setenv("ENVIRONMENT", "test")


def _register(client: TestClient):
    payload = {
        "tenant_name": f"revoke-{uuid4().hex[:6]}",
        "admin_email": "revoke@example.com",
        "organization_name": "Revoke Corp",
        "password": "test-password-123",
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def test_revoke_api_key_flow():
    client = TestClient(app)
    reg_body = _register(client)
    customer_id = reg_body["customer_id"]
    api_key = reg_body["api_key"]

    # Sanity: list keys returns at least one
    list_resp = client.get(
        f"/api/v1/customers/{customer_id}/api-keys",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    assert list_resp.status_code == 200
    keys = list_resp.json()
    assert any(k["api_key"].startswith("kb_") for k in keys)

    # Revoke
    revoke_resp = client.delete(
        f"/api/v1/customers/{customer_id}/api-keys/{api_key}",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    assert revoke_resp.status_code == 200, revoke_resp.text
    assert revoke_resp.json()["revoked"] is True

    # Attempt authenticated query with revoked key should 401
    database_id = uuid4()
    query_resp = client.post(
        f"/api/v1/databases/{database_id}/query",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"query": "MATCH (n) RETURN n", "parameters": {}, "timeout_seconds": 1},
    )
    assert query_resp.status_code == 401
