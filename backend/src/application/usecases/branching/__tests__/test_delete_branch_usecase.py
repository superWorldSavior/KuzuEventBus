"""Unit tests for DeleteBranchUseCase."""
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, Mock

from src.application.usecases.branching import DeleteBranchUseCase
from src.application.dtos.branching import DeleteBranchRequest


@pytest.mark.asyncio
async def test_delete_branch_delegates_to_delete_database_usecase():
    """Should delegate branch deletion to DeleteKuzuDatabaseUseCase."""
    delete_db_uc = Mock()
    delete_db_uc.execute = AsyncMock(return_value=True)
    
    uc = DeleteBranchUseCase(delete_db_uc=delete_db_uc)
    
    request = DeleteBranchRequest(
        tenant_id=uuid4(),
        branch_database_id=uuid4(),
        branch_database_name="prod-db--branch--test",
    )
    
    result = await uc.execute(request)
    
    assert result.deleted is True
    assert result.branch_name == "prod-db--branch--test"
    delete_db_uc.execute.assert_called_once()


@pytest.mark.asyncio
async def test_delete_branch_raises_error_when_deletion_fails():
    """Should raise RuntimeError if database deletion fails."""
    delete_db_uc = Mock()
    delete_db_uc.execute = AsyncMock(return_value=False)
    
    uc = DeleteBranchUseCase(delete_db_uc=delete_db_uc)
    
    request = DeleteBranchRequest(
        tenant_id=uuid4(),
        branch_database_id=uuid4(),
        branch_database_name="prod-db--branch--test",
    )
    
    with pytest.raises(RuntimeError, match="Failed to delete branch"):
        await uc.execute(request)
