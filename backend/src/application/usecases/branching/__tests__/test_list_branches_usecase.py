"""Unit tests for ListBranchesUseCase."""
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, Mock
from datetime import datetime

from src.application.usecases.branching import ListBranchesUseCase
from src.application.dtos.branching import ListBranchesRequest
from src.domain.database_management.value_objects import DatabaseMetadata, DatabaseName


@pytest.mark.asyncio
async def test_list_branches_filters_branches_for_parent_database():
    """Should filter and return only branches of the specified parent database."""
    tenant_id = uuid4()
    
    # Mock repository with databases
    mock_repo = Mock()
    mock_repo.find_by_tenant = AsyncMock(return_value=[
        DatabaseMetadata(
            id=uuid4(),
            tenant_id=tenant_id,
            name=DatabaseName("prod-db"),
            filesystem_path="/path1",
            created_at=datetime.utcnow(),
        ),
        DatabaseMetadata(
            id=uuid4(),
            tenant_id=tenant_id,
            name=DatabaseName("prod-db--branch--alice-test"),
            filesystem_path="/path2",
            created_at=datetime.utcnow(),
        ),
        DatabaseMetadata(
            id=uuid4(),
            tenant_id=tenant_id,
            name=DatabaseName("prod-db--branch--bob-feature"),
            filesystem_path="/path3",
            created_at=datetime.utcnow(),
        ),
        DatabaseMetadata(
            id=uuid4(),
            tenant_id=tenant_id,
            name=DatabaseName("other-db"),
            filesystem_path="/path4",
            created_at=datetime.utcnow(),
        ),
    ])
    
    uc = ListBranchesUseCase(metadata_repo=mock_repo)
    
    request = ListBranchesRequest(
        tenant_id=tenant_id,
        parent_database_name="prod-db",
    )
    
    result = await uc.execute(request)
    
    assert result.parent_database == "prod-db"
    assert result.count == 2
    assert len(result.branches) == 2
    
    branch_names = [b.name for b in result.branches]
    assert "alice-test" in branch_names
    assert "bob-feature" in branch_names


@pytest.mark.asyncio
async def test_list_branches_returns_empty_when_no_branches_exist():
    """Should return empty list when parent database has no branches."""
    tenant_id = uuid4()
    
    mock_repo = Mock()
    mock_repo.find_by_tenant = AsyncMock(return_value=[
        DatabaseMetadata(
            id=uuid4(),
            tenant_id=tenant_id,
            name=DatabaseName("prod-db"),
            filesystem_path="/path",
            created_at=datetime.utcnow(),
        ),
    ])
    
    uc = ListBranchesUseCase(metadata_repo=mock_repo)
    
    request = ListBranchesRequest(
        tenant_id=tenant_id,
        parent_database_name="prod-db",
    )
    
    result = await uc.execute(request)
    
    assert result.parent_database == "prod-db"
    assert result.count == 0
    assert len(result.branches) == 0
