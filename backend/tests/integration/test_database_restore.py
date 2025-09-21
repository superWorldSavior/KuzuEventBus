from __future__ import annotations

import httpx
import pytest
from uuid import uuid4

from src.presentation.api.main import app


@pytest.fixture(autouse=True)
def _set_env(tmp_path, monkeypatch):
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    monkeypatch.setenv("ENVIRONMENT", "test")


async def _register(async_client: httpx.AsyncClient) -> str:
    payload = {
        "tenant_name": f"tenant-{uuid4().hex[:6]}",
        "admin_email": f"flow-{uuid4().hex[:6]}@example.com",
        "organization_name": "Flow Corp",
        "password": "test-password-123",
    }
    reg_response = await async_client.post("/api/v1/auth/register", json=payload)
    assert reg_response.status_code == 200, reg_response.text
    return reg_response.json()["api_key"]


@pytest.mark.integration
@pytest.mark.anyio
async def test_database_restore_overwrite_flow():
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        api_key = await _register(async_client)

        # Create database
        create_payload = {"name": f"db-{uuid4().hex[:6]}", "description": "db for restore"}
        create_resp = await async_client.post(
            "/api/v1/databases/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=create_payload,
        )
        assert create_resp.status_code == 201, create_resp.text
        db_id = create_resp.json()["id"]

        # Create snapshot
        snap_resp = await async_client.post(
            f"/api/v1/databases/{db_id}/snapshots",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert snap_resp.status_code == 201, snap_resp.text
        snap = snap_resp.json()
        snapshot_id = snap.get("id") or snap.get("snapshot_id")
        assert snapshot_id

        # Restore (overwrite)
        restore_resp = await async_client.post(
            f"/api/v1/databases/{db_id}/restore",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"snapshot_id": snapshot_id},
        )
        assert restore_resp.status_code == 200, restore_resp.text
        body = restore_resp.json()
        assert body.get("restored") is True
        assert body.get("database_id") == db_id
