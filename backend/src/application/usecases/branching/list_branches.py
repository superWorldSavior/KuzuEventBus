"""List branches use case - retrieves all branches for a database."""
from __future__ import annotations

from src.application.dtos.branching import (
    ListBranchesRequest,
    ListBranchesResponse,
    BranchInfo,
)
from src.domain.branching import BranchName
from src.domain.shared.ports.database_management import DatabaseMetadataRepository
from src.infrastructure.logging.config import get_logger

logger = get_logger("list_branches_uc")


class ListBranchesUseCase:
    """
    Lists all branches for a parent database.
    
    Scans all databases in tenant and filters those matching the branch pattern.
    """
    
    def __init__(self, metadata_repo: DatabaseMetadataRepository):
        self._metadata_repo = metadata_repo
    
    async def execute(self, request: ListBranchesRequest) -> ListBranchesResponse:
        """List all branches for a database."""
        logger.info(
            "Listing branches",
            parent=request.parent_database_name,
            tenant_id=str(request.tenant_id),
        )
        
        # Get all databases for tenant
        all_dbs = await self._metadata_repo.find_by_tenant(request.tenant_id)
        
        # Filter branches of this parent database
        branches: list[BranchInfo] = []
        pattern = f"{request.parent_database_name}--branch--"
        
        for db_meta in all_dbs:
            db_name = db_meta.name.value
            
            if db_name.startswith(pattern):
                parsed = BranchName.from_full_name(db_name)
                
                if parsed:
                    parent, branch_name = parsed
                    
                    branches.append(
                        BranchInfo(
                            name=branch_name.value,
                            full_name=db_name,
                            parent=parent,
                            branch_database_id=db_meta.id,
                            created_at=db_meta.created_at.isoformat() + "Z" if db_meta.created_at else "",
                            description=None,  # Not stored in metadata currently
                        )
                    )
        
        logger.info(f"Found {len(branches)} branches for {request.parent_database_name}")
        
        return ListBranchesResponse(
            parent_database=request.parent_database_name,
            branches=branches,
            count=len(branches),
        )
