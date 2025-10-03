"""Test resolve_database_id helper that accepts UUID or database name."""
import pytest
from uuid import UUID, uuid4
from unittest.mock import AsyncMock, Mock

from src.presentation.api.databases.routes import resolve_database_id
from src.domain.database_management.value_objects import DatabaseMetadata, DatabaseName


@pytest.mark.asyncio
async def test_resolve_database_id_with_uuid(monkeypatch):
    """Should return UUID directly when given a valid UUID string."""
    test_uuid = uuid4()
    tenant_id = uuid4()
    
    result = await resolve_database_id(str(test_uuid), tenant_id)
    
    assert result == test_uuid


@pytest.mark.asyncio
async def test_resolve_database_id_with_name_found(monkeypatch):
    """Should lookup database by name and return its UUID."""
    test_uuid = uuid4()
    tenant_id = uuid4()
    db_name = "my-social-network"
    
    # Mock the repository to return a database metadata
    mock_repo = Mock()
    mock_repo.find_by_name = AsyncMock(return_value=DatabaseMetadata(
        id=test_uuid,
        tenant_id=tenant_id,
        name=DatabaseName(db_name),
        filesystem_path="/some/path",
        created_at="2024-01-01T00:00:00Z"
    ))
    
    # Patch PostgresDatabaseMetadataRepository constructor
    def mock_repo_constructor():
        return mock_repo
    
    monkeypatch.setattr(
        "src.presentation.api.databases.routes.PostgresDatabaseMetadataRepository",
        mock_repo_constructor
    )
    
    result = await resolve_database_id(db_name, tenant_id)
    
    assert result == test_uuid
    mock_repo.find_by_name.assert_called_once_with(tenant_id=tenant_id, name=db_name)


@pytest.mark.asyncio
async def test_resolve_database_id_with_name_not_found(monkeypatch):
    """Should raise 404 HTTPException when database name not found."""
    from fastapi import HTTPException
    
    tenant_id = uuid4()
    db_name = "non-existent-db"
    
    # Mock the repository to return None
    mock_repo = Mock()
    mock_repo.find_by_name = AsyncMock(return_value=None)
    
    def mock_repo_constructor():
        return mock_repo
    
    monkeypatch.setattr(
        "src.presentation.api.databases.routes.PostgresDatabaseMetadataRepository",
        mock_repo_constructor
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await resolve_database_id(db_name, tenant_id)
    
    assert exc_info.value.status_code == 404
    assert db_name in exc_info.value.detail
