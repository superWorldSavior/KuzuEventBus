"""Database management router.

Database provisioning and management endpoints with explicit resource creation.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

from src.infrastructure.logging.config import get_logger
from src.application.usecases.provision_tenant_resources import (
    ProvisionTenantResourcesUseCase,
    ProvisionTenantResourcesRequest,
    ProvisionTenantResourcesResponse,
)
from src.domain.database_management.provisioning import (
    BucketProvisioningService,
    DatabaseProvisioningService,
    DatabaseMetadataRepository,
)
from src.infrastructure.database.minio_bucket_provisioning import MinioBucketProvisioningAdapter
from src.infrastructure.database.kuzu_database_provisioning import KuzuDatabaseProvisioningAdapter
from src.infrastructure.database.database_metadata_repository import PostgresDatabaseMetadataRepository

router = APIRouter()
db_logger = get_logger("database_operations")


def get_provisioning_use_case() -> ProvisionTenantResourcesUseCase:
    """Provide provisioning use case with configured dependencies."""
    bucket_service: BucketProvisioningService = MinioBucketProvisioningAdapter()
    db_service: DatabaseProvisioningService = KuzuDatabaseProvisioningAdapter()
    metadata_repo: DatabaseMetadataRepository = PostgresDatabaseMetadataRepository()
    
    return ProvisionTenantResourcesUseCase(
        bucket_service=bucket_service,
        database_service=db_service,
        metadata_repository=metadata_repo,
    )


class ProvisionRequest(BaseModel):
    database_name: Optional[str] = Field("main", description="Database name (defaults to 'main')")


class ProvisionResponse(BaseModel):
    tenant_id: str
    bucket: str
    database_name: str
    database_id: str
    filesystem_path: str
    created_at: str


class CreateDatabaseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Database name")
    description: Optional[str] = Field(None, max_length=500, description="Database description")


class DatabaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    created_at: str
    size_bytes: int
    tenant_id: str


class DatabaseListResponse(BaseModel):
    tenant: str
    databases: List[DatabaseResponse]
    total_count: int
    total_size_bytes: int


@router.post("/provision/{tenant_id}", response_model=ProvisionResponse, status_code=status.HTTP_201_CREATED)
async def provision_tenant_database(
    request: Request,
    tenant_id: UUID,
    provision_request: ProvisionRequest,
    use_case: ProvisionTenantResourcesUseCase = Depends(get_provisioning_use_case),
) -> ProvisionResponse:
    """Provision bucket and default database for tenant."""
    db_logger.info("Database provisioning requested", tenant_id=str(tenant_id), database_name=provision_request.database_name)
    try:
        request_obj = ProvisionTenantResourcesRequest(
            tenant_id=tenant_id,
            database_name=provision_request.database_name,
        )
        response = await use_case.execute(request_obj)
        return ProvisionResponse(
            tenant_id=str(response.tenant_id),
            bucket=response.bucket,
            database_name=response.database_name,
            database_id=str(response.database_id),
            filesystem_path=response.filesystem_path,
            created_at=response.created_at,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))


def _not_implemented() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Database management endpoints are not implemented yet",
    )


@router.get("/", response_model=DatabaseListResponse)
async def list_databases(request: Request) -> DatabaseListResponse:
    db_logger.info("Database listing requested", path=request.url.path)
    _not_implemented()


@router.post("/", response_model=DatabaseResponse, status_code=status.HTTP_201_CREATED)
async def create_database(request: Request, create_request: CreateDatabaseRequest) -> DatabaseResponse:
    db_logger.info("Database creation requested", name=create_request.name)
    _not_implemented()


@router.get("/{database_id}", response_model=DatabaseResponse)
async def get_database(request: Request, database_id: str) -> DatabaseResponse:
    db_logger.info("Database lookup requested", database_id=database_id)
    _not_implemented()


@router.delete("/{database_id}")
async def delete_database(request: Request, database_id: str) -> None:
    db_logger.info("Database deletion requested", database_id=database_id)
    _not_implemented()
