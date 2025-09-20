from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List
from uuid import UUID

from src.domain.shared.ports import AuthorizationService, CacheService, KuzuDatabaseRepository


@dataclass(frozen=True)
class ListKuzuDatabasesRequest:
    tenant_id: UUID


class ListKuzuDatabasesUseCase:
    def __init__(
        self,
        authz_service: AuthorizationService,
        database_repository: KuzuDatabaseRepository,
        cache_service: CacheService,
    ) -> None:
        self._authz = authz_service
        self._dbs = database_repository
        self._cache = cache_service

    async def execute(self, req: ListKuzuDatabasesRequest) -> List[Dict[str, Any]]:
        allowed = await self._authz.check_permission(
            tenant_id=req.tenant_id, resource="database", action="list"
        )
        if not allowed:
            raise PermissionError("Not authorized to list databases")

        databases = await self._dbs.find_by_tenant(req.tenant_id)

        # Best-effort enrichment from cache
        enriched: List[Dict[str, Any]] = []
        for db in databases:
            db_id = db.get("database_id") or db.get("id")
            if db_id:
                cached = await self._cache.get(f"db_info:{db_id}")
                if cached and isinstance(cached, dict):
                    db = {**db, **cached}
            enriched.append(db)
        return enriched
