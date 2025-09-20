from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.ports import (
    AuthorizationService,
    CacheService,
    KuzuDatabaseRepository,
    FileStorageService,
    NotificationService,
)


@dataclass(frozen=True)
class DeleteKuzuDatabaseRequest:
    tenant_id: UUID
    database_id: UUID


class DeleteKuzuDatabaseUseCase:
    def __init__(
        self,
        authz_service: AuthorizationService,
        database_repository: KuzuDatabaseRepository,
        storage: FileStorageService,
        cache_service: CacheService,
        notification_service: NotificationService,
    ) -> None:
        self._authz = authz_service
        self._dbs = database_repository
        self._storage = storage
        self._cache = cache_service
        self._notify = notification_service

    async def execute(self, req: DeleteKuzuDatabaseRequest) -> bool:
        allowed = await self._authz.check_permission(
            tenant_id=req.tenant_id, resource="database", action="delete"
        )
        if not allowed:
            raise PermissionError("Not authorized to delete databases")

        info = await self._dbs.find_by_id(req.database_id)
        if not info or info.get("tenant_id") != str(req.tenant_id):
            return False

        # Delete physical storage if path is known
        file_path = info.get("file_path") or info.get("path")
        if file_path:
            try:
                await self._storage.delete_database(file_path)
            except Exception:
                # best-effort delete; proceed to metadata cleanup
                pass

        ok = await self._dbs.delete(req.database_id)
        if ok:
            await self._cache.delete(f"db_info:{req.database_id}")
            await self._notify.send_notification(
                tenant_id=req.tenant_id,
                notification_type="database_deleted",
                title="Database Deleted",
                message=f"Database '{info.get('name')}' has been deleted",
                metadata={"database_id": str(req.database_id)},
            )
        return ok
