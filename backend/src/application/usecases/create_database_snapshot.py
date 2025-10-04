from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from uuid import UUID
import io
import tarfile

from src.domain.shared.ports import (
    AuthorizationService,
    CacheService,
    EventService,
)
from src.domain.shared.ports.database_management import (
    KuzuDatabaseRepository,
    SnapshotRepository,
    FileStorageService,
)
from src.domain.shared.ports.query_execution import DistributedLockService
from src.infrastructure.settings import settings


@dataclass(frozen=True)
class CreateDatabaseSnapshotRequest:
    """Request to create a database snapshot."""
    tenant_id: UUID
    database_id: UUID
    archive: bool = True  # when True, store under snapshots/archive/


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
        events: EventService | None = None,
    ) -> None:
        self._authz = authz
        self._dbs = db_repo
        self._storage = storage
        self._snapshots = snapshots
        self._locks = locks
        self._cache = cache
        self._events = events

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
            # Normalize: if a directory path was stored, prefer '<dir>/data.kuzu' when present
            if p.is_dir() and (p / "data.kuzu").exists():
                p = p / "data.kuzu"

            # If path doesn't exist, try to initialize (first-touch). Kuzu may create a file or a directory at 'p'.
            if not p.exists():
                try:
                    import kuzu  # type: ignore
                    p.parent.mkdir(parents=True, exist_ok=True)
                    _ = kuzu.Database(str(p))
                except Exception as e:  # noqa: BLE001
                    raise RuntimeError("Failed to initialize Kuzu database for snapshot") from e
            # After init, 'p' may be a file or a directory named 'data.kuzu'

            # Construire un tar.gz NORMALISÉ:
            # <database_id>/data.kuzu
            from tempfile import mkdtemp
            import shutil
            import io
            import uuid
            # Add UUID suffix to avoid collisions when creating multiple snapshots in the same second
            ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-{uuid.uuid4().hex[:8]}"
            try:
                tmp_parent = Path(mkdtemp(prefix="kuzu-snap-"))
                # Kuzu DB is normally a directory (data.kuzu/), but support file fallback for tests
                db_path = p
                root_dir = tmp_parent / str(req.database_id)
                root_dir.mkdir(parents=True, exist_ok=True)
                # Copy DB content into normalized location inside archive
                if db_path.is_dir():
                    shutil.copytree(str(db_path), str(root_dir / "data.kuzu"))
                else:
                    shutil.copy2(str(db_path), str(root_dir / "data.kuzu"))

                buf = io.BytesIO()
                with tarfile.open(fileobj=buf, mode="w:gz") as tar:
                    tar.add(str(root_dir), arcname=str(req.database_id))
                data = buf.getvalue()
                prefix = "snapshots/archive" if req.archive else "snapshots"
                filename = f"{prefix}/snapshot-{ts}.tar.gz"
            finally:
                # Cleanup temporaire
                try:
                    shutil.rmtree(str(tmp_parent))
                except Exception:
                    pass

            size = len(data)
            checksum = sha256(data).hexdigest()

            # Reuse upload API, destination under tenant/database hierarchy
            object_key = await self._storage.upload_database(
                tenant_id=req.tenant_id,
                database_id=req.database_id,
                file_content=data,
                filename=filename,
            )

            # Tag object with retention hint for lifecycle
            try:
                cfg = settings()
                days = cfg.retention.snapshots_archive_days if req.archive else cfg.retention.wal_days
                await self._storage.set_object_tags(object_key, {"retention_days": str(days), "category": "snapshot-archive" if req.archive else "snapshot"})
            except Exception:
                # Tagging is best-effort; ignore failures
                pass

            created_at = datetime.now(timezone.utc).isoformat()
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

            # Emit snapshot created event
            if self._events:
                try:
                    db_info = await self._dbs.find_by_id(req.database_id)
                    await self._events.emit_event(
                        tenant_id=req.tenant_id,
                        event_type="snapshot_created",
                        title="Snapshot Created",
                        message=f"Snapshot for database '{db_info.get('name', 'unknown')}' created successfully",
                        metadata={
                            "snapshot_id": str(snap_id),
                            "database_id": str(req.database_id),
                            "object_key": object_key,
                            "size_bytes": str(size),
                        },
                    )
                except Exception:
                    pass  # Best-effort

            return CreateDatabaseSnapshotResponse(
                snapshot_id=snap_id,
                object_key=object_key,
                checksum=checksum,
                size_bytes=size,
                created_at=created_at,
            )
        finally:
            await self._locks.release_lock(lock_res, token)
