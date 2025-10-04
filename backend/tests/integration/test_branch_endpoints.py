"""Integration tests for branch endpoints."""
from __future__ import annotations

import httpx
import pytest
from uuid import uuid4

from src.presentation.api.main import app


@pytest.fixture(autouse=True)
def _set_env(tmp_path, monkeypatch):
    """Set test environment."""
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    monkeypatch.setenv("ENVIRONMENT", "test")


async def _register(async_client: httpx.AsyncClient) -> str:
    """Register a test customer and return API key."""
    payload = {
        "tenant_name": f"tenant-{uuid4().hex[:6]}",
        "admin_email": f"test-{uuid4().hex[:4]}@example.com",
        "organization_name": "Test Corp",
        "password": "test-password-123",
    }
    reg_response = await async_client.post("/api/v1/auth/register", json=payload)
    assert reg_response.status_code == 200, reg_response.text
    return reg_response.json()["api_key"]


async def _create_database(async_client: httpx.AsyncClient, api_key: str, name: str) -> dict:
    """Create a test database."""
    create_resp = await async_client.post(
        "/api/v1/databases/",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"name": name, "description": "Test database"},
    )
    assert create_resp.status_code == 201, create_resp.text
    return create_resp.json()


@pytest.mark.integration
@pytest.mark.anyio
async def test_branch_create_and_list_flow():
    """Test creating a branch and listing branches."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        # Setup: Register and create database
        api_key = await _register(async_client)
        prod_db = await _create_database(async_client, api_key, f"prod-db-{uuid4().hex[:6]}")
        
        # Create branch
        branch_payload = {
            "source_database": prod_db["name"],
            "branch_name": "test-migration",
            "from_snapshot": "latest",
            "description": "Test branch",
        }
        create_resp = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=branch_payload,
        )
        assert create_resp.status_code == 201, create_resp.text
        branch = create_resp.json()
        
        # Verify branch response
        assert branch["name"] == "test-migration"
        assert branch["full_name"] == f"{prod_db['name']}--branch--test-migration"
        assert branch["parent"] == prod_db["name"]
        assert "snapshot_id" in branch
        assert "created_at" in branch
        assert branch["description"] == "Test branch"
        
        # List branches
        list_resp = await async_client.get(
            f"/api/v1/branches/of/{prod_db['name']}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert list_resp.status_code == 200, list_resp.text
        listing = list_resp.json()
        
        assert listing["database"] == prod_db["name"]
        assert listing["count"] == 1
        assert len(listing["branches"]) == 1
        assert listing["branches"][0]["name"] == "test-migration"


@pytest.mark.integration
@pytest.mark.anyio
async def test_branch_create_with_invalid_name():
    """Test creating branch with invalid name fails."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        api_key = await _register(async_client)
        prod_db = await _create_database(async_client, api_key, f"prod-db-{uuid4().hex[:6]}")
        
        # Try to create branch with invalid name (starts with hyphen)
        branch_payload = {
            "source_database": prod_db["name"],
            "branch_name": "-invalid-name",
            "from_snapshot": "latest",
        }
        create_resp = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=branch_payload,
        )
        
        assert create_resp.status_code == 400, create_resp.text
        assert "Invalid branch name" in create_resp.text


@pytest.mark.integration
@pytest.mark.anyio
async def test_branch_merge_flow():
    """Test merging a branch back to parent."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        # Setup
        api_key = await _register(async_client)
        prod_db = await _create_database(async_client, api_key, f"prod-db-{uuid4().hex[:6]}")
        
        # Create branch
        branch_payload = {
            "source_database": prod_db["name"],
            "branch_name": "feature-branch",
            "from_snapshot": "latest",
        }
        create_resp = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=branch_payload,
        )
        assert create_resp.status_code == 201
        branch = create_resp.json()
        
        # Merge branch to prod
        merge_payload = {"target_database": prod_db["name"]}
        merge_resp = await async_client.post(
            f"/api/v1/branches/{branch['full_name']}/merge",
            headers={"Authorization": f"Bearer {api_key}"},
            json=merge_payload,
        )
        assert merge_resp.status_code == 200, merge_resp.text
        merge_result = merge_resp.json()
        
        assert merge_result["merged"] is True
        assert merge_result["branch"] == branch["full_name"]
        assert merge_result["target"] == prod_db["name"]
        assert "snapshot_id" in merge_result


@pytest.mark.integration
@pytest.mark.anyio
async def test_branch_delete_flow():
    """Test deleting a branch."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        # Setup
        api_key = await _register(async_client)
        prod_db = await _create_database(async_client, api_key, f"prod-db-{uuid4().hex[:6]}")
        
        # Create branch
        branch_payload = {
            "source_database": prod_db["name"],
            "branch_name": "temp-branch",
            "from_snapshot": "latest",
        }
        create_resp = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=branch_payload,
        )
        assert create_resp.status_code == 201
        branch = create_resp.json()
        
        # Delete branch
        delete_resp = await async_client.delete(
            f"/api/v1/branches/{branch['full_name']}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert delete_resp.status_code == 200, delete_resp.text
        delete_result = delete_resp.json()
        
        assert delete_result["deleted"] is True
        assert delete_result["branch"] == branch["full_name"]
        
        # Verify branch is gone from list
        list_resp = await async_client.get(
            f"/api/v1/branches/of/{prod_db['name']}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert list_resp.status_code == 200
        listing = list_resp.json()
        assert listing["count"] == 0


@pytest.mark.integration
@pytest.mark.anyio
async def test_branch_with_database_name_resolution():
    """Test that branches work with database names (not just UUIDs)."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        # Setup
        api_key = await _register(async_client)
        db_name = f"my-prod-db-{uuid4().hex[:6]}"
        prod_db = await _create_database(async_client, api_key, db_name)
        
        # Create branch using database NAME (not UUID)
        branch_payload = {
            "source_database": db_name,  # Using name!
            "branch_name": "test",
            "from_snapshot": "latest",
        }
        create_resp = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key}"},
            json=branch_payload,
        )
        assert create_resp.status_code == 201, create_resp.text
        branch = create_resp.json()
        
        # Merge using NAME
        merge_resp = await async_client.post(
            f"/api/v1/branches/{branch['full_name']}/merge",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"target_database": db_name},  # Using name!
        )
        assert merge_resp.status_code == 200, merge_resp.text


@pytest.mark.integration
@pytest.mark.anyio
async def test_branch_isolation():
    """Test that multiple users can have branches without conflicts."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        # Setup two tenants
        api_key1 = await _register(async_client)
        api_key2 = await _register(async_client)
        
        # Both create databases with same name (different tenants)
        db_name = f"shared-db-{uuid4().hex[:6]}"
        db1 = await _create_database(async_client, api_key1, db_name)
        db2 = await _create_database(async_client, api_key2, db_name)
        
        # Both create branches with same name
        branch_payload = {
            "source_database": db_name,
            "branch_name": "alice-feature",
            "from_snapshot": "latest",
        }
        
        create1 = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key1}"},
            json=branch_payload,
        )
        assert create1.status_code == 201
        
        create2 = await async_client.post(
            "/api/v1/branches/",
            headers={"Authorization": f"Bearer {api_key2}"},
            json=branch_payload,
        )
        assert create2.status_code == 201
        
        # Verify isolation - tenant1 only sees their branch
        list1 = await async_client.get(
            f"/api/v1/branches/of/{db_name}",
            headers={"Authorization": f"Bearer {api_key1}"},
        )
        assert list1.status_code == 200
        branches1 = list1.json()["branches"]
        assert len(branches1) == 1
        
        # Verify isolation - tenant2 only sees their branch
        list2 = await async_client.get(
            f"/api/v1/branches/of/{db_name}",
            headers={"Authorization": f"Bearer {api_key2}"},
        )
        assert list2.status_code == 200
        branches2 = list2.json()["branches"]
        assert len(branches2) == 1


@pytest.mark.integration
@pytest.mark.anyio
async def test_list_branches_for_database_without_branches():
    """Test listing branches for database that has no branches."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as async_client:
        api_key = await _register(async_client)
        prod_db = await _create_database(async_client, api_key, f"db-{uuid4().hex[:6]}")
        
        list_resp = await async_client.get(
            f"/api/v1/branches/of/{prod_db['name']}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert list_resp.status_code == 200
        listing = list_resp.json()
        
        assert listing["database"] == prod_db["name"]
        assert listing["count"] == 0
        assert listing["branches"] == []
