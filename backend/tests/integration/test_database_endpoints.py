from __future__ import annotations

import base64
import logging
from uuid import uuid4

import pytest
import httpx

from src.presentation.api.main import app

# Enable INFO logs for this test module
logging.basicConfig(level=logging.INFO)

pytestmark = pytest.mark.integration


@pytest.fixture(autouse=True)
def _set_env(tmp_path, monkeypatch):
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


@pytest.mark.anyio
async def test_database_crud_and_upload_flow():
    logger = logging.getLogger("it.test.database_flow")
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        api_key = await _register(async_client)
        logger.info("registered tenant and obtained api key suffix=%s", api_key[-6:])

        # Create database
        create_payload = {"name": f"db-{uuid4().hex[:6]}", "description": "test-db"}
        create_resp = await async_client.post(
            "/api/v1/databases/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=create_payload,
        )
        logger.info("create database status=%s body=%s", create_resp.status_code, create_resp.text)
        assert create_resp.status_code == 201, create_resp.text
        db = create_resp.json()
        db_id = db["id"]
        assert db["name"] == create_payload["name"]

        # List databases
        list_resp = await async_client.get(
            "/api/v1/databases/",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        logger.info("list databases status=%s body=%s", list_resp.status_code, list_resp.text)
        assert list_resp.status_code == 200
        lst = list_resp.json()
        assert any(item["id"] == db_id for item in lst["databases"])  # type: ignore[index]

        # Get database by id
        get_resp = await async_client.get(
            f"/api/v1/databases/{db_id}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        logger.info("get database status=%s body=%s", get_resp.status_code, get_resp.text)
        assert get_resp.status_code == 200, get_resp.text
        info = get_resp.json()
        assert info["id"] == db_id

        # Upload a small file
        content = base64.b64encode(b"hello kuzu").decode("ascii")
        upload_payload = {"file_name": "seed.kuzu", "file_content_base64": content}
        upload_resp = await async_client.post(
            f"/api/v1/databases/{db_id}/upload",
            headers={"Authorization": f"Bearer {api_key}"},
            json=upload_payload,
        )
        logger.info("upload file status=%s body=%s", upload_resp.status_code, upload_resp.text)
        assert upload_resp.status_code == 201, upload_resp.text
        up = upload_resp.json()
        assert up["file_size"] == len(b"hello kuzu")
        assert "file_path" in up

        # Delete database
        del_resp = await async_client.delete(
            f"/api/v1/databases/{db_id}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        logger.info("delete database status=%s body=%s", del_resp.status_code, del_resp.text)
        assert del_resp.status_code == 200, del_resp.text
        body = del_resp.json()
        assert body.get("deleted") is True

        # Get should now fail
        get_after = await async_client.get(
            f"/api/v1/databases/{db_id}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        logger.info("get after delete status=%s body=%s", get_after.status_code, get_after.text)
        assert get_after.status_code == 404
