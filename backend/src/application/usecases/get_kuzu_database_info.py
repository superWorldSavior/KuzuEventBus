from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, CacheService, KuzuDatabaseRepository, KuzuQueryService


@dataclass(frozen=True)
class GetKuzuDatabaseInfoRequest:
    tenant_id: UUID
    database_id: UUID


class GetKuzuDatabaseInfoUseCase:
    def __init__(
        self,
        authz_service: AuthorizationService,
        database_repository: KuzuDatabaseRepository,
        query_service: KuzuQueryService,
        cache_service: CacheService,
    ) -> None:
        self._authz = authz_service
        self._dbs = database_repository
        self._queries = query_service
        self._cache = cache_service

    async def execute(self, req: GetKuzuDatabaseInfoRequest) -> Optional[Dict[str, Any]]:
        allowed = await self._authz.check_permission(
            tenant_id=req.tenant_id, resource="database", action="read"
        )
        if not allowed:
            raise PermissionError("Not authorized to read database")

        cache_key = f"db_info:{req.database_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        info = await self._dbs.find_by_id(req.database_id)
        if not info:
            return None
        if info.get("tenant_id") != str(req.tenant_id):
            raise PermissionError("Database does not belong to tenant")

        # Enrich with schema/stats if possible (requires database path)
        db_path = info.get("file_path") or info.get("path")
        if db_path:
            try:
                schema = await self._queries.get_database_schema(db_path)
                stats = await self._queries.get_database_stats(db_path)
                info = {**info, "schema": schema, "stats": stats}
            except Exception:
                # Best-effort enrichment; do not fail the whole call
                pass

        await self._cache.set(cache_key, info, expire_seconds=1800)
        return info
