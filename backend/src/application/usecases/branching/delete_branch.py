"""Delete branch use case - removes a branch database."""
from __future__ import annotations

from src.application.dtos.branching import DeleteBranchRequest, DeleteBranchResponse
from src.application.usecases.delete_kuzu_database import (
    DeleteKuzuDatabaseUseCase,
    DeleteKuzuDatabaseRequest,
)
from src.infrastructure.logging.config import get_logger

logger = get_logger("delete_branch_uc")


class DeleteBranchUseCase:
    """
    Deletes a branch database.
    
    This simply delegates to the existing DeleteKuzuDatabaseUseCase.
    """
    
    def __init__(self, delete_db_uc: DeleteKuzuDatabaseUseCase):
        self._delete_db_uc = delete_db_uc
    
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
        
        return DeleteBranchResponse(
            deleted=True,
            branch_name=request.branch_database_name,
        )
