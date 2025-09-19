from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from uuid import UUID
import io
import tarfile

from src.domain.shared.ports import (
    AuthorizationService,
    CacheService,
)
from src.domain.shared.ports.database_management import (
    KuzuDatabaseRepository,
    SnapshotRepository,
    FileStorageService,
)
from src.domain.shared.ports.query_execution import DistributedLockService


@dataclass(frozen=True)
class CreateDatabaseSnapshotRequest:
    tenant_id: UUID
    database_id: UUID


@dataclass(frozen=True)
class CreateDatabaseSnapshotResponse:
    snapshot_id: UUID
    object_key: str
    checksum: str
    size_bytes: int
    created_at: str


class CreateDatabaseSnapshotUseCase:
    def __init__(
        self,
        authz: AuthorizationService,
        db_repo: KuzuDatabaseRepository,
        storage: FileStorageService,
        snapshots: SnapshotRepository,
        locks: DistributedLockService,
        cache: CacheService,
    ) -> None:
        self._authz = authz
        self._dbs = db_repo
        self._storage = storage
        self._snapshots = snapshots
        self._locks = locks
        self._cache = cache

    async def execute(self, req: CreateDatabaseSnapshotRequest) -> CreateDatabaseSnapshotResponse:
        allowed = await self._authz.check_permission(req.tenant_id, "database", "backup")
        if not allowed:
            raise PermissionError("Not authorized to snapshot database")

        info = await self._dbs.find_by_id(req.database_id)
        if not info or info.get("tenant_id") != str(req.tenant_id):
            raise FileNotFoundError("Database not found")

        file_path = info.get("file_path") or info.get("path")
        if not file_path:
            raise RuntimeError("Database file path unknown")

        # Lock resource to avoid concurrent writes during snapshot
        lock_res = f"db:{req.database_id}:snapshot"
        token = await self._locks.acquire_lock(lock_res, timeout_seconds=10)
        if not token:
            raise TimeoutError("Could not acquire snapshot lock")

        try:
            p = Path(file_path)
            ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

            # If Kuzu database path is a directory, create a tar.gz snapshot
            if p.is_dir():
                buf = io.BytesIO()
                with tarfile.open(fileobj=buf, mode="w:gz") as tar:
                    # On met le répertoire racine sous son nom pour restauration simple
                    tar.add(str(p), arcname=p.name)
                data = buf.getvalue()
                filename = f"snapshot-{ts}.tar.gz"
            else:
                data = p.read_bytes()
                filename = f"snapshot-{ts}.kuzu"

            size = len(data)
            checksum = sha256(data).hexdigest()

            # Reuse upload API, destination under tenant/database hierarchy
            object_key = await self._storage.upload_database(
                tenant_id=req.tenant_id,
                database_id=req.database_id,
                file_content=data,
                filename=filename,
            )

            created_at = datetime.utcnow().isoformat()
            snap_id = await self._snapshots.save(
                tenant_id=req.tenant_id,
                database_id=req.database_id,
                object_key=object_key,
                checksum=checksum,
                size_bytes=size,
                created_at=created_at,
            )

            # Invalidate any cached DB info if relevant
            await self._cache.delete(f"db_info:{req.database_id}")

            return CreateDatabaseSnapshotResponse(
                snapshot_id=snap_id,
                object_key=object_key,
                checksum=checksum,
                size_bytes=size,
                created_at=created_at,
            )
        finally:
            await self._locks.release_lock(lock_res, token)
