from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List
from uuid import UUID

from src.domain.shared.ports import AuthorizationService
from src.domain.shared.ports.database_management import SnapshotRepository


@dataclass(frozen=True)
class ListDatabaseSnapshotsRequest:
    tenant_id: UUID
    database_id: UUID


class ListDatabaseSnapshotsUseCase:
    def __init__(self, authz: AuthorizationService, snapshots: SnapshotRepository) -> None:
        self._authz = authz
        self._snapshots = snapshots

    async def execute(self, req: ListDatabaseSnapshotsRequest) -> List[Dict[str, Any]]:
        allowed = await self._authz.check_permission(req.tenant_id, "database", "backup")
        if not allowed:
            raise PermissionError("Not authorized to list snapshots")
        return await self._snapshots.list_by_database(req.tenant_id, req.database_id)
