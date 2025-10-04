"""Use case for provisioning tenant resources.

Orchestrates bucket and database provisioning following Clean Architecture
principles with explicit separation of concerns.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from src.domain.shared.ports.database_management import (
    BucketProvisioningService,
    DatabaseProvisioningService,
    DatabaseMetadataRepository,
    SnapshotRepository,
    FileStorageService,
)
from src.domain.shared.ports import CacheService, EventService
from src.domain.shared.ports.query_execution import DistributedLockService
from src.domain.database_management.value_objects import DatabaseName
from src.application.usecases.create_database_snapshot import (
    CreateDatabaseSnapshotUseCase,
    CreateDatabaseSnapshotRequest,
)


@dataclass
class ProvisionTenantResourcesRequest:
    tenant_id: UUID
    database_name: Optional[str] = None


@dataclass
class ProvisionTenantResourcesResponse:
    tenant_id: UUID
    bucket: str
    database_name: str
    database_id: UUID
    filesystem_path: str
    created_at: str


class ProvisionTenantResourcesUseCase:
    """Use case for provisioning tenant infrastructure resources."""

    def __init__(
        self,
        bucket_service: BucketProvisioningService,
        database_service: DatabaseProvisioningService,
        metadata_repository: DatabaseMetadataRepository,
        event_service: Optional[EventService] = None,
        snapshot_usecase: Optional[CreateDatabaseSnapshotUseCase] = None,
        default_database_name: str = "main",
    ) -> None:
        self._bucket_service = bucket_service
        self._database_service = database_service
        self._metadata_repository = metadata_repository
        self._events = event_service
        self._snapshot_usecase = snapshot_usecase
        self._default_name = default_database_name

    async def execute(self, request: ProvisionTenantResourcesRequest) -> ProvisionTenantResourcesResponse:
        """Execute tenant resource provisioning."""
        name = DatabaseName(request.database_name or self._default_name)
        
        # Check if database already exists
        existing = await self._metadata_repository.find_by_name(request.tenant_id, name.value)
        if existing:
            raise ValueError(f"Database '{name.value}' already exists for tenant")
        
        # Ensure bucket
        bucket_identifier = await self._bucket_service.ensure_bucket(request.tenant_id)
        
        # Create database
        meta = await self._database_service.create_database(request.tenant_id, name)
        
        # Persist metadata
        await self._metadata_repository.save(meta)
        
        # Emit database created event
        if self._events:
            try:
                await self._events.emit_event(
                    tenant_id=request.tenant_id,
                    event_type="database_created",
                    title="Database Created",
                    message=f"Database '{name.value}' has been created successfully",
                    metadata={
                        "database_id": str(meta.id),
                        "database_name": name.value,
                        "filesystem_path": meta.filesystem_path,
                    },
                )
            except Exception:
                pass  # Best-effort event emission
        
        # Create initial snapshot for PITR functionality (best-effort)
        if self._snapshot_usecase:
            try:
                await self._snapshot_usecase.execute(
                    CreateDatabaseSnapshotRequest(
                        tenant_id=request.tenant_id,
                        database_id=meta.id,
                    )
                )
            except Exception as e:
                # Log warning but don't fail provisioning if snapshot fails
                import logging
                logging.getLogger(__name__).warning(
                    f"Failed to create initial snapshot for database {meta.id}: {e}"
                )
        
        return ProvisionTenantResourcesResponse(
            tenant_id=request.tenant_id,
            bucket=bucket_identifier,
            database_name=name.value,
            database_id=meta.id,
            filesystem_path=meta.filesystem_path,
            created_at=meta.created_at.isoformat(),
        )