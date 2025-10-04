"""Database branching/versioning routes.

Provides Git-like branching for databases:
- Create isolated branches for testing/development
- Merge branches back to parent (overwrite)
- Delete branches when done
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from uuid import UUID

from src.presentation.api.context.request_context import (
    RequestContext,
    get_request_context,
)
from src.application.usecases.branching import (
    CreateBranchUseCase,
    MergeBranchUseCase,
    DeleteBranchUseCase,
    ListBranchesUseCase,
)
from src.application.dtos.branching import (
    CreateBranchRequest as CreateBranchReq,
    MergeBranchRequest as MergeBranchReq,
    DeleteBranchRequest as DeleteBranchReq,
    ListBranchesRequest as ListBranchesReq,
)
from src.application.usecases.create_database_snapshot import CreateDatabaseSnapshotUseCase
from src.application.usecases.restore_database_from_snapshot import RestoreDatabaseFromSnapshotUseCase
from src.application.usecases.provision_tenant_resources import ProvisionTenantResourcesUseCase
from src.application.usecases.delete_kuzu_database import DeleteKuzuDatabaseUseCase
from src.infrastructure.dependencies import (
    kuzu_database_repository,
    file_storage_service,
    snapshot_repository,
    lock_service,
    authorization_service,
    cache_service,
    event_service,
    kuzu_query_service,
)
from src.infrastructure.database.database_metadata_repository import PostgresDatabaseMetadataRepository
from src.domain.shared.ports.database_management import (
    BucketProvisioningService,
    DatabaseProvisioningService,
)
from src.infrastructure.database.minio_bucket_provisioning import MinioBucketProvisioningAdapter
from src.infrastructure.kuzu.kuzu_database_provisioning import KuzuDatabaseProvisioningAdapter
from src.infrastructure.logging.config import get_logger

router = APIRouter(prefix="/branches", tags=["branches"])
logger = get_logger("branches_routes")


# ==================== DTOs ====================

class CreateBranchRequest(BaseModel):
    source_database: str = Field(..., description="Source database ID or name")
    branch_name: str = Field(..., description="Branch name (alphanumeric, hyphens)")
    from_snapshot: str | None = Field("latest", description="'latest', timestamp, or snapshot ID")
    description: str | None = None


class BranchResponse(BaseModel):
    name: str
    full_name: str  # With --branch-- prefix
    parent: str
    snapshot_id: str | None
    created_at: str
    description: str | None


class MergeBranchRequest(BaseModel):
    target_database: str = Field(..., description="Target database to merge into")


class BranchListResponse(BaseModel):
    database: str
    branches: list[BranchResponse]
    count: int


# ==================== Dependencies ====================

def get_create_snapshot_uc() -> CreateDatabaseSnapshotUseCase:
    return CreateDatabaseSnapshotUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        storage=file_storage_service(),
        snapshots=snapshot_repository(),
        locks=lock_service(),
        cache=cache_service(),
    )


def get_restore_snapshot_uc() -> RestoreDatabaseFromSnapshotUseCase:
    return RestoreDatabaseFromSnapshotUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        storage=file_storage_service(),
        snapshots=snapshot_repository(),
        locks=lock_service(),
        cache=cache_service(),
    )


def get_provision_uc() -> ProvisionTenantResourcesUseCase:
    return ProvisionTenantResourcesUseCase(
        bucket_service=MinioBucketProvisioningAdapter(),
        database_service=KuzuDatabaseProvisioningAdapter(),
        metadata_repository=PostgresDatabaseMetadataRepository(),
        snapshot_usecase=get_create_snapshot_uc(),
    )


def get_delete_db_uc() -> DeleteKuzuDatabaseUseCase:
    return DeleteKuzuDatabaseUseCase(
        authz_service=authorization_service(),
        database_repository=kuzu_database_repository(),
        storage=file_storage_service(),
        cache_service=cache_service(),
        event_service=event_service(),
    )


# Branching use cases

def get_create_branch_uc() -> CreateBranchUseCase:
    return CreateBranchUseCase(
        snapshot_uc=get_create_snapshot_uc(),
        provision_uc=get_provision_uc(),
        restore_uc=get_restore_snapshot_uc(),
        # PITR deps for timestamp-based branch creation
        db_repo=kuzu_database_repository(),
        snapshots=snapshot_repository(),
        storage=file_storage_service(),
        locks=lock_service(),
        cache=cache_service(),
        kuzu=kuzu_query_service(),
    )


def get_merge_branch_uc() -> MergeBranchUseCase:
    return MergeBranchUseCase(
        snapshot_uc=get_create_snapshot_uc(),
        restore_uc=get_restore_snapshot_uc(),
    )


def get_delete_branch_uc() -> DeleteBranchUseCase:
    return DeleteBranchUseCase(
        delete_db_uc=get_delete_db_uc(),
    )


def get_list_branches_uc() -> ListBranchesUseCase:
    return ListBranchesUseCase(
        metadata_repo=PostgresDatabaseMetadataRepository(),
    )


# ==================== Helper Functions ====================


async def resolve_database_id(database_identifier: str, tenant_id: UUID) -> UUID:
    """Resolve database identifier (UUID or name) to UUID."""
    try:
        return UUID(database_identifier)
    except ValueError:
        repo = PostgresDatabaseMetadataRepository()
        db_meta = await repo.find_by_name(tenant_id=tenant_id, name=database_identifier)
        if not db_meta:
            raise HTTPException(
                status_code=404,
                detail=f"Database '{database_identifier}' not found"
            )
        return db_meta.id


# ==================== Routes ====================

@router.post(
    "/",
    response_model=BranchResponse,
    status_code=201,
    summary="Create a database branch",
    description=(
        "Creates an isolated copy of a database for testing/development.\n\n"
        "The branch is a full clone (via snapshot+restore) visible as a regular database.\n"
        "Branch naming pattern: `{source}--branch--{name}`"
    ),
)
async def create_branch(
    request: CreateBranchRequest,
    ctx: RequestContext = Depends(get_request_context),
    use_case: CreateBranchUseCase = Depends(get_create_branch_uc),
) -> BranchResponse:
    """Create a new branch from an existing database."""
    try:
        # Resolve source database
        source_db_id = await resolve_database_id(request.source_database, ctx.tenant_id)
        
        # Execute use case
        result = await use_case.execute(
            CreateBranchReq(
                tenant_id=ctx.tenant_id,
                source_database_id=source_db_id,
                source_database_name=request.source_database,
                branch_name=request.branch_name,
                from_snapshot=request.from_snapshot,
                description=request.description,
            )
        )
        
        # Map to API response
        return BranchResponse(
            name=result.branch_name,
            full_name=result.full_name,
            parent=result.parent_database_name,
            snapshot_id=str(result.snapshot_id),
            created_at=result.created_at,
            description=result.description,
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Branch creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Branch creation failed: {str(e)}") from e


@router.post(
    "/{branch_name}/merge",
    summary="Merge branch to target database",
    description=(
        "Merges a branch back into a target database.\n\n"
        "**WARNING**: This OVERWRITES the target database content!"
    ),
)
async def merge_branch(
    branch_name: str,
    request: MergeBranchRequest,
    ctx: RequestContext = Depends(get_request_context),
    use_case: MergeBranchUseCase = Depends(get_merge_branch_uc),
) -> dict:
    """Merge a branch into target database (overwrites target)."""
    try:
        # Resolve branch and target databases
        branch_db_id = await resolve_database_id(branch_name, ctx.tenant_id)
        target_db_id = await resolve_database_id(request.target_database, ctx.tenant_id)
        
        # Execute use case
        result = await use_case.execute(
            MergeBranchReq(
                tenant_id=ctx.tenant_id,
                branch_database_id=branch_db_id,
                branch_database_name=branch_name,
                target_database_id=target_db_id,
                target_database_name=request.target_database,
            )
        )
        
        return {
            "merged": result.merged,
            "branch": result.branch_name,
            "target": result.target_database_name,
            "snapshot_id": str(result.snapshot_id),
        }
    
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Branch merge failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Merge failed: {str(e)}") from e


@router.delete(
    "/{branch_name}",
    summary="Delete a branch",
    description="Deletes a branch database. Cannot be undone.",
)
async def delete_branch(
    branch_name: str,
    ctx: RequestContext = Depends(get_request_context),
    use_case: DeleteBranchUseCase = Depends(get_delete_branch_uc),
) -> dict:
    """Delete a branch database."""
    try:
        # Resolve branch database
        branch_db_id = await resolve_database_id(branch_name, ctx.tenant_id)
        
        # Execute use case
        result = await use_case.execute(
            DeleteBranchReq(
                tenant_id=ctx.tenant_id,
                branch_database_id=branch_db_id,
                branch_database_name=branch_name,
            )
        )
        
        return {"deleted": result.deleted, "branch": result.branch_name}
    
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Branch deletion failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}") from e


@router.get(
    "/of/{database}",
    response_model=BranchListResponse,
    summary="List branches of a database",
    description="Lists all branches created from a specific database.",
)
async def list_branches(
    database: str,
    ctx: RequestContext = Depends(get_request_context),
    use_case: ListBranchesUseCase = Depends(get_list_branches_uc),
) -> BranchListResponse:
    """List all branches for a database."""
    try:
        # Execute use case
        result = await use_case.execute(
            ListBranchesReq(
                tenant_id=ctx.tenant_id,
                parent_database_name=database,
            )
        )
        
        # Map to API response
        branches = [
            BranchResponse(
                name=b.name,
                full_name=b.full_name,
                parent=b.parent,
                snapshot_id=None,  # Not tracked currently
                created_at=b.created_at,
                description=b.description,
            )
            for b in result.branches
        ]
        
        return BranchListResponse(
            database=result.parent_database,
            branches=branches,
            count=result.count,
        )
    
    except Exception as e:  # noqa: BLE001
        logger.error("List branches failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list branches: {str(e)}") from e
