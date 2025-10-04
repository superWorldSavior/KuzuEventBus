"""Merge branch use case - merges branch back into target database."""
from __future__ import annotations

from datetime import datetime

from src.application.dtos.branching import MergeBranchRequest, MergeBranchResponse
from src.application.usecases.create_database_snapshot import (
    CreateDatabaseSnapshotUseCase,
    CreateDatabaseSnapshotRequest,
)
from src.application.usecases.restore_database_from_snapshot import (
    RestoreDatabaseFromSnapshotUseCase,
    RestoreDatabaseFromSnapshotRequest,
)
from src.infrastructure.logging.config import get_logger
from src.domain.shared.ports import EventService

logger = get_logger("merge_branch_uc")


class MergeBranchUseCase:
    """
    Merges a branch into a target database.
    
    WARNING: This OVERWRITES the target database!
    
    Orchestrates:
    1. Create snapshot of branch
    2. Restore branch snapshot into target (overwrites target)
    """
    
    def __init__(
        self,
        snapshot_uc: CreateDatabaseSnapshotUseCase,
        restore_uc: RestoreDatabaseFromSnapshotUseCase,
        events: EventService | None = None,
    ):
        self._snapshot_uc = snapshot_uc
        self._restore_uc = restore_uc
        self._events = events
    
    async def execute(self, request: MergeBranchRequest) -> MergeBranchResponse:
        """Merge branch into target database."""
        logger.info(
            "Merging branch",
            branch=request.branch_database_name,
            target=request.target_database_name,
            tenant_id=str(request.tenant_id),
        )
        
        # 1. Create snapshot of branch
        logger.info("Creating snapshot of branch")
        snap_result = await self._snapshot_uc.execute(
            CreateDatabaseSnapshotRequest(
                tenant_id=request.tenant_id,
                database_id=request.branch_database_id,
            )
        )
        logger.info(f"Branch snapshot created: {snap_result.snapshot_id}")
        
        # 2. Restore branch snapshot into target (OVERWRITES target!)
        logger.info(f"Restoring branch into target {request.target_database_name}")
        await self._restore_uc.execute(
            RestoreDatabaseFromSnapshotRequest(
                tenant_id=request.tenant_id,
                database_id=request.target_database_id,
                snapshot_id=snap_result.snapshot_id,
            )
        )
        logger.info("Branch merged successfully")
        
        merged_at = datetime.utcnow().isoformat() + "Z"
        
        # Emit branch merged event
        if self._events:
            try:
                await self._events.emit_event(
                    tenant_id=request.tenant_id,
                    event_type="branch_merged",
                    title="Branch Merged",
                    message=f"Branch '{request.branch_database_name}' merged into '{request.target_database_name}'",
                    metadata={
                        "branch_name": request.branch_database_name,
                        "target_database": request.target_database_name,
                        "snapshot_id": str(snap_result.snapshot_id),
                    },
                )
            except Exception:
                pass  # Best-effort
        
        return MergeBranchResponse(
            merged=True,
            branch_name=request.branch_database_name,
            target_database_name=request.target_database_name,
            snapshot_id=snap_result.snapshot_id,
            merged_at=merged_at,
        )
