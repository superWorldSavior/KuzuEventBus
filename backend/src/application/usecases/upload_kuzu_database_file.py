from __future__ import annotations

from dataclasses import dataclass
from typing import Dict
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, CacheService, FileStorageService, KuzuDatabaseRepository, EventService


@dataclass(frozen=True)
class UploadKuzuDatabaseFileRequest:
    tenant_id: UUID
    database_id: UUID
    file_content: bytes
    file_name: str


@dataclass(frozen=True)
class UploadKuzuDatabaseFileResponse:
    file_path: str
    file_size: int
    uploaded_at: str
    upload_url: str | None


class UploadKuzuDatabaseFileUseCase:
    def __init__(
        self,
        authz_service: AuthorizationService,
        database_repository: KuzuDatabaseRepository,
        storage: FileStorageService,
        cache_service: CacheService,
        event_service: EventService,
    ) -> None:
        self._authz = authz_service
        self._dbs = database_repository
        self._storage = storage
        self._cache = cache_service
        self._events = event_service

    async def execute(self, req: UploadKuzuDatabaseFileRequest) -> UploadKuzuDatabaseFileResponse:
        allowed = await self._authz.check_permission(
            tenant_id=req.tenant_id, resource="database", action="write"
        )
        if not allowed:
            raise PermissionError("Not authorized to upload files")

        info = await self._dbs.find_by_id(req.database_id)
        if not info or info.get("tenant_id") != str(req.tenant_id):
            raise PermissionError("Database does not belong to tenant")

        file_size = len(req.file_content)
        # Note: quota check could be added here if needed via authz_service.check_quota

        # Upload
        dest_path = await self._storage.upload_database(
            tenant_id=req.tenant_id,
            database_id=req.database_id,
            file_content=req.file_content,
            filename=req.file_name,
        )

        # Update size if repo supports it; otherwise, invalidate cache
        await self._cache.delete(f"db_info:{req.database_id}")

        await self._events.emit_event(
            tenant_id=req.tenant_id,
            event_type="file_uploaded",
            title="File Uploaded",
            message=f"File '{req.file_name}' uploaded to database '{info.get('name')}'",
            metadata={
                "database_id": str(req.database_id),
                "file_name": req.file_name,
                "file_size": file_size,
            },
        )

        return UploadKuzuDatabaseFileResponse(
            file_path=dest_path,
            file_size=file_size,
            uploaded_at="",
            upload_url=None,
        )
