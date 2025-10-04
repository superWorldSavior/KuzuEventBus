"""Unit tests for CreateBranchUseCase."""
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, Mock

from src.application.usecases.branching import CreateBranchUseCase
from src.application.dtos.branching import CreateBranchRequest


@pytest.mark.asyncio
async def test_create_branch_orchestrates_snapshot_provision_restore():
    """Should orchestrate snapshot creation, database provision, and snapshot restore."""
    tenant_id = uuid4()
    source_db_id = uuid4()
    branch_db_id = uuid4()
    snapshot_id = uuid4()
    
    # Mock dependencies
    snapshot_uc = Mock()
    snapshot_uc.execute = AsyncMock(return_value=Mock(snapshot_id=snapshot_id))
    
    provision_uc = Mock()
    provision_uc.execute = AsyncMock(return_value=Mock(
        database_id=branch_db_id,
        database_name="prod-db--branch--test",
    ))
    
    restore_uc = Mock()
    restore_uc.execute = AsyncMock(return_value=None)
    
    # Create use case
    uc = CreateBranchUseCase(
        snapshot_uc=snapshot_uc,
        provision_uc=provision_uc,
        restore_uc=restore_uc,
    )
    
    # Execute
    request = CreateBranchRequest(
        tenant_id=tenant_id,
        source_database_id=source_db_id,
        source_database_name="prod-db",
        branch_name="test-migration",
        from_snapshot="latest",
        description="Test branch",
    )
    
    result = await uc.execute(request)
    
    # Assert result
    assert result.branch_name == "test-migration"
    assert result.full_name == "prod-db--branch--test-migration"
    assert result.parent_database_name == "prod-db"
    assert result.branch_database_id == branch_db_id
    assert result.snapshot_id == snapshot_id
    assert result.description == "Test branch"
    
    # Verify use cases were called
    snapshot_uc.execute.assert_called_once()
    provision_uc.execute.assert_called_once()
    restore_uc.execute.assert_called_once()


@pytest.mark.asyncio
async def test_create_branch_rejects_invalid_branch_name():
    """Should raise ValueError when branch name is invalid."""
    uc = CreateBranchUseCase(
        snapshot_uc=Mock(),
        provision_uc=Mock(),
        restore_uc=Mock(),
    )
    
    request = CreateBranchRequest(
        tenant_id=uuid4(),
        source_database_id=uuid4(),
        source_database_name="prod-db",
        branch_name="-invalid",  # Cannot start with hyphen
        from_snapshot="latest",
    )
    
    with pytest.raises(ValueError, match="Invalid branch name"):
        await uc.execute(request)


@pytest.mark.asyncio
async def test_create_branch_uses_existing_snapshot_when_provided():
    """Should use existing snapshot ID instead of creating new one."""
    snapshot_id = uuid4()
    
    snapshot_uc = Mock()
    snapshot_uc.execute = AsyncMock()  # Should NOT be called
    
    provision_uc = Mock()
    provision_uc.execute = AsyncMock(return_value=Mock(
        database_id=uuid4(),
        database_name="prod-db--branch--test",
    ))
    
    restore_uc = Mock()
    restore_uc.execute = AsyncMock(return_value=None)
    
    uc = CreateBranchUseCase(
        snapshot_uc=snapshot_uc,
        provision_uc=provision_uc,
        restore_uc=restore_uc,
    )
    
    request = CreateBranchRequest(
        tenant_id=uuid4(),
        source_database_id=uuid4(),
        source_database_name="prod-db",
        branch_name="test",
        from_snapshot=str(snapshot_id),  # Use existing snapshot
    )
    
    result = await uc.execute(request)
    
    # Snapshot use case should NOT be called
    snapshot_uc.execute.assert_not_called()
    assert result.snapshot_id == snapshot_id
