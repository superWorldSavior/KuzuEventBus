import asyncio
from uuid import uuid4

import pytest
import httpx
from src.presentation.api.main import app


@pytest.fixture(autouse=True)
def _set_env(tmp_path, monkeypatch):
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    monkeypatch.setenv("ENVIRONMENT", "test")


@pytest.mark.anyio
async def test_registration_then_authenticated_query_flow():
    reg_payload = {
        "tenant_name": f"tenant-{uuid4().hex[:6]}",
        "admin_email": "flow@example.com",
        "organization_name": "Flow Corp",
        "password": "test-password-123",
    }
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        reg_response = await async_client.post("/api/v1/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, reg_response.text
        reg_body = reg_response.json()
        api_key = reg_body["api_key"]
        assert api_key.startswith("kb_")

        database_id = uuid4()
        query_response = await async_client.post(
            f"/api/v1/databases/{database_id}/query",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"query": "MATCH (n) RETURN n", "parameters": {}, "timeout_seconds": 1},
        )
        assert query_response.status_code in (200, 202, 400), query_response.text
        if query_response.status_code == 200:
            body = query_response.json()
            assert "results" in body
            assert "execution_time_ms" in body
