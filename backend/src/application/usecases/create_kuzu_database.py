from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID, uuid4

from src.domain.shared.ports import (
    AuthorizationService,
    CacheService,
    CustomerAccountRepository,
    KuzuDatabaseRepository,
    KuzuQueryService,
    NotificationService,
)
from src.domain.shared.value_objects import EntityId


@dataclass(frozen=True)
class CreateKuzuDatabaseRequest:
    tenant_id: UUID
    database_name: str
    description: Optional[str] = None


@dataclass(frozen=True)
class CreateKuzuDatabaseResponse:
    database_id: UUID
    name: str
    description: Optional[str]
    created_at: Optional[str]
    size_bytes: int
    table_count: int


class CreateKuzuDatabaseUseCase:
    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        database_repository: KuzuDatabaseRepository,
        query_service: KuzuQueryService,
        authz_service: AuthorizationService,
        notification_service: NotificationService,
        cache_service: CacheService,
    ) -> None:
        self._accounts = account_repository
        self._dbs = database_repository
        self._queries = query_service
        self._authz = authz_service
        self._notify = notification_service
        self._cache = cache_service

    async def execute(self, req: CreateKuzuDatabaseRequest) -> CreateKuzuDatabaseResponse:
        # Permission check
        allowed = await self._authz.check_permission(
            tenant_id=req.tenant_id, resource="database", action="create"
        )
        if not allowed:
            raise PermissionError("Not authorized to create databases")

        # Quota check
        quota = await self._authz.check_quota(
            tenant_id=req.tenant_id, resource_type="databases", requested_amount=1
        )
        if not quota.get("allowed"):
            raise ValueError(
                f"Database quota exceeded. Used: {quota.get('used')}/{quota.get('limit')}"
            )

        # Tenant must exist and be active
        account = await self._accounts.find_by_id(EntityId(req.tenant_id))
        if not account or not getattr(account, "is_active")():
            raise ValueError("Invalid or inactive tenant")

        # Create empty database on filesystem (convention path)
        file_path = f"databases/{req.tenant_id}/{req.database_name}"
        created = await self._queries.create_empty_database(file_path)
        if not created:
            raise RuntimeError("Failed to create database")

        # Persist metadata
        metadata = {
            "name": req.database_name,
            "description": req.description,
            "tenant_id": str(req.tenant_id),
            "created_at": None,
        }
        database_id = await self._dbs.save_database_metadata(
            tenant_id=req.tenant_id,
            database_name=req.database_name,
            file_path=file_path,
            size_bytes=0,
            metadata=metadata,
        )

        info = {
            "created_at": metadata["created_at"],
            "size_bytes": 0,
            "table_count": 0,
        }
        await self._notify.send_notification(
            tenant_id=req.tenant_id,
            notification_type="database_created",
            title="Database Created",
            message=f"Database '{req.database_name}' has been created successfully",
            metadata={"database_id": str(database_id)},
        )
        await self._cache.set(
            key=f"db_info:{database_id}", value=info, expire_seconds=1800
        )

        return CreateKuzuDatabaseResponse(
            database_id=database_id,
            name=req.database_name,
            description=req.description,
            created_at=info.get("created_at"),
            size_bytes=int(info.get("size_bytes", 0)),
            table_count=int(info.get("table_count", 0)),
        )
