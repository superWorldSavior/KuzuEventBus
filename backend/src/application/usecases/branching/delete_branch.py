"""Delete branch use case - removes a branch database."""
from __future__ import annotations

from src.application.dtos.branching import DeleteBranchRequest, DeleteBranchResponse
from src.application.usecases.delete_kuzu_database import (
    DeleteKuzuDatabaseUseCase,
    DeleteKuzuDatabaseRequest,
)
from src.infrastructure.logging.config import get_logger
from src.domain.shared.ports import EventService

logger = get_logger("delete_branch_uc")


class DeleteBranchUseCase:
    """
    Deletes a branch database.
    
    This simply delegates to the existing DeleteKuzuDatabaseUseCase.
    """
    
    def __init__(self, delete_db_uc: DeleteKuzuDatabaseUseCase, events: EventService | None = None):
        self._delete_db_uc = delete_db_uc
        self._events = events
    
    async def execute(self, request: DeleteBranchRequest) -> DeleteBranchResponse:
        """Delete a branch database."""
        logger.info(
            "Deleting branch",
            branch=request.branch_database_name,
            tenant_id=str(request.tenant_id),
        )
        
        # Delegate to existing delete database use case
        success = await self._delete_db_uc.execute(
            DeleteKuzuDatabaseRequest(
                tenant_id=request.tenant_id,
                database_id=request.branch_database_id,
            )
        )
        
        if not success:
            raise RuntimeError(f"Failed to delete branch: {request.branch_database_name}")
        
        logger.info("Branch deleted successfully", branch=request.branch_database_name)
        
        # Emit branch deleted event
        if self._events:
            try:
                await self._events.emit_event(
                    tenant_id=request.tenant_id,
                    event_type="branch_deleted",
                    title="Branch Deleted",
                    message=f"Branch '{request.branch_database_name}' has been deleted",
                    metadata={
                        "branch_name": request.branch_database_name,
                        "branch_database_id": str(request.branch_database_id),
                    },
                )
            except Exception:
                pass  # Best-effort
        
        return DeleteBranchResponse(
            deleted=True,
            branch_name=request.branch_database_name,
        )
