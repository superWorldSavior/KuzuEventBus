"""Unit tests for MergeBranchUseCase."""
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, Mock

from src.application.usecases.branching import MergeBranchUseCase
from src.application.dtos.branching import MergeBranchRequest


@pytest.mark.asyncio
async def test_merge_branch_creates_snapshot_and_restores_to_target():
    """Should create snapshot of branch and restore it to target database."""
    snapshot_id = uuid4()
    
    snapshot_uc = Mock()
    snapshot_uc.execute = AsyncMock(return_value=Mock(snapshot_id=snapshot_id))
    
    restore_uc = Mock()
    restore_uc.execute = AsyncMock(return_value=None)
    
    uc = MergeBranchUseCase(
        snapshot_uc=snapshot_uc,
        restore_uc=restore_uc,
    )
    
    request = MergeBranchRequest(
        tenant_id=uuid4(),
        branch_database_id=uuid4(),
        branch_database_name="prod-db--branch--test",
        target_database_id=uuid4(),
        target_database_name="prod-db",
    )
    
    result = await uc.execute(request)
    
    assert result.merged is True
    assert result.branch_name == "prod-db--branch--test"
    assert result.target_database_name == "prod-db"
    assert result.snapshot_id == snapshot_id
    
    snapshot_uc.execute.assert_called_once()
    restore_uc.execute.assert_called_once()
