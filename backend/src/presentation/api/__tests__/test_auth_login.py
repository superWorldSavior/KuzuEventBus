import uuid
import pytest
from fastapi.testclient import TestClient

from src.presentation.api.main import app

pytestmark = pytest.mark.integration


def _register(client: TestClient, email: str, password: str):
    payload = {
        "tenant_name": f"tenant-{uuid.uuid4().hex[:6]}",
        "organization_name": "LoginOrg",
        "admin_email": email,
        "password": password,
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def test_login_flow_register_then_login_and_access_protected():
    client = TestClient(app)

    email = f"user-{uuid.uuid4().hex[:6]}@example.com"
    password = "test-password-123"

    reg = _register(client, email, password)
    customer_id = reg["customer_id"]

    # Login with credentials
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200, login_resp.text
    login_body = login_resp.json()
    assert "api_key" in login_body

    # Access a protected endpoint with the returned API key
    headers = {"Authorization": f"Bearer {login_body['api_key']}"}
    details_resp = client.get(f"/api/v1/customers/{customer_id}", headers=headers)
    assert details_resp.status_code == 200, details_resp.text
