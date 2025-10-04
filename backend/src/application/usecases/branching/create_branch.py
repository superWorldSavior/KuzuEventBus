"""Create branch use case - orchestrates snapshot + provision + restore."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from src.application.dtos.branching import CreateBranchRequest, CreateBranchResponse
from src.application.usecases.create_database_snapshot import (
    CreateDatabaseSnapshotUseCase,
    CreateDatabaseSnapshotRequest,
)
from src.application.usecases.provision_tenant_resources import (
    ProvisionTenantResourcesUseCase,
    ProvisionTenantResourcesRequest,
)
from src.application.usecases.restore_database_from_snapshot import (
    RestoreDatabaseFromSnapshotUseCase,
    RestoreDatabaseFromSnapshotRequest,
)
from src.domain.branching import BranchName
from src.infrastructure.logging.config import get_logger

logger = get_logger("create_branch_uc")


class CreateBranchUseCase:
    """
    Creates an isolated branch from an existing database.
    
    Orchestrates:
    1. Create snapshot of source database
    2. Provision new database for branch
    3. Restore snapshot into branch database
    """
    
    def __init__(
        self,
        snapshot_uc: CreateDatabaseSnapshotUseCase,
        provision_uc: ProvisionTenantResourcesUseCase,
        restore_uc: RestoreDatabaseFromSnapshotUseCase,
    ):
        self._snapshot_uc = snapshot_uc
        self._provision_uc = provision_uc
        self._restore_uc = restore_uc
    
    async def execute(self, request: CreateBranchRequest) -> CreateBranchResponse:
        """Create a branch from source database."""
        logger.info(
            "Creating branch",
            source=request.source_database_name,
            branch=request.branch_name,
            tenant_id=str(request.tenant_id),
        )
        
        # Validate branch name
        try:
            branch_name_vo = BranchName(request.branch_name)
        except ValueError as e:
            raise ValueError(f"Invalid branch name: {e}") from e
        
        # 1. Create snapshot of source database (if "latest")
        snapshot_id: UUID
        if request.from_snapshot == "latest" or not request.from_snapshot:
            logger.info("Creating snapshot of source database")
            snap_result = await self._snapshot_uc.execute(
                CreateDatabaseSnapshotRequest(
                    tenant_id=request.tenant_id,
                    database_id=request.source_database_id,
                )
            )
            snapshot_id = snap_result.snapshot_id
            logger.info(f"Snapshot created: {snapshot_id}")
        else:
            # Use existing snapshot ID
            snapshot_id = UUID(request.from_snapshot)
            logger.info(f"Using existing snapshot: {snapshot_id}")
        
        # 2. Create new database for branch
        full_branch_name = branch_name_vo.to_full_name(request.source_database_name)
        logger.info(f"Provisioning branch database: {full_branch_name}")
        
        provision_result = await self._provision_uc.execute(
            ProvisionTenantResourcesRequest(
                tenant_id=request.tenant_id,
                database_name=full_branch_name,
            )
        )
        branch_db_id = provision_result.database_id
        logger.info(f"Branch database provisioned: {branch_db_id}")
        
        # 3. Restore snapshot into branch
        logger.info(f"Restoring snapshot {snapshot_id} into branch")
        await self._restore_uc.execute(
            RestoreDatabaseFromSnapshotRequest(
                tenant_id=request.tenant_id,
                database_id=branch_db_id,
                snapshot_id=snapshot_id,
            )
        )
        logger.info("Snapshot restored successfully")
        
        created_at = datetime.utcnow().isoformat() + "Z"
        
        logger.info("Branch created successfully", branch=full_branch_name)
        
        return CreateBranchResponse(
            branch_name=request.branch_name,
            full_name=full_branch_name,
            parent_database_name=request.source_database_name,
            branch_database_id=branch_db_id,
            snapshot_id=snapshot_id,
            created_at=created_at,
            description=request.description,
        )
