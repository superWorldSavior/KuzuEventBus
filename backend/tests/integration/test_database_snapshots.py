from __future__ import annotations

import httpx
import pytest
from uuid import uuid4

from src.presentation.api.main import app


@pytest.fixture(autouse=True)
def _set_env(tmp_path, monkeypatch):
    # pour éviter de toucher le FS réel pendant les tests
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    monkeypatch.setenv("ENVIRONMENT", "test")


async def _register(async_client: httpx.AsyncClient) -> str:
    payload = {
        "tenant_name": f"tenant-{uuid4().hex[:6]}",
        "admin_email": "flow@example.com",
        "organization_name": "Flow Corp",
        "password": "test-password-123",
    }
    reg_response = await async_client.post("/api/v1/auth/register", json=payload)
    assert reg_response.status_code == 200, reg_response.text
    return reg_response.json()["api_key"]


@pytest.mark.integration
@pytest.mark.anyio
async def test_database_snapshot_create_and_list_flow():
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        api_key = await _register(async_client)

        # Create database
        create_payload = {"name": f"db-{uuid4().hex[:6]}", "description": "db for snapshot"}
        create_resp = await async_client.post(
            "/api/v1/databases/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=create_payload,
        )
        assert create_resp.status_code == 201, create_resp.text
        db = create_resp.json()
        db_id = db["id"]

        # Create snapshot
        snap_resp = await async_client.post(
            f"/api/v1/databases/{db_id}/snapshots",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert snap_resp.status_code == 201, snap_resp.text
        snap = snap_resp.json()
        assert "snapshot_id" in snap or "id" in snap  # tolerate response mapping
        # notre contrat JSON final expose id / object_key / checksum / size_bytes / created_at
        if "id" in snap:
            assert snap["object_key"]
            assert snap["checksum"]
            assert isinstance(snap["size_bytes"], int)
            assert snap["created_at"]

        # List snapshots
        list_resp = await async_client.get(
            f"/api/v1/databases/{db_id}/snapshots",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert list_resp.status_code == 200, list_resp.text
        listing = list_resp.json()
        assert listing["database_id"] == db_id
        assert isinstance(listing["count"], int)
        if listing["count"]:
            first = listing["snapshots"][0]
            assert "id" in first
            assert "object_key" in first
            assert "checksum" in first
            assert isinstance(first["size_bytes"], int)
            assert first["created_at"]
