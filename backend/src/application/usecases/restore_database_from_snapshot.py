from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID
import io
import os
import tarfile
import tempfile

from src.domain.shared.ports import AuthorizationService, CacheService
from src.domain.shared.ports.database_management import (
    KuzuDatabaseRepository,
    SnapshotRepository,
    FileStorageService,
)
from src.domain.shared.ports.query_execution import DistributedLockService


@dataclass(frozen=True)
class RestoreDatabaseFromSnapshotRequest:
    tenant_id: UUID
    database_id: UUID
    snapshot_id: UUID


@dataclass(frozen=True)
class RestoreDatabaseFromSnapshotResponse:
    restored: bool
    database_id: UUID
    mode: str = "overwrite"
    restored_at: str = ""


class RestoreDatabaseFromSnapshotUseCase:
    def __init__(
        self,
        authz: AuthorizationService,
        db_repo: KuzuDatabaseRepository,
        snapshots: SnapshotRepository,
        storage: FileStorageService,
        locks: DistributedLockService,
        cache: CacheService,
    ) -> None:
        self._authz = authz
        self._dbs = db_repo
        self._snapshots = snapshots
        self._storage = storage
        self._locks = locks
        self._cache = cache

    async def execute(self, req: RestoreDatabaseFromSnapshotRequest) -> RestoreDatabaseFromSnapshotResponse:
        allowed = await self._authz.check_permission(req.tenant_id, "database", "restore")
        if not allowed:
            raise PermissionError("Not authorized to restore database")

        info = await self._dbs.find_by_id(req.database_id)
        if not info or info.get("tenant_id") != str(req.tenant_id):
            raise FileNotFoundError("Database not found")
        target_path_str = info.get("file_path") or info.get("path")
        if not target_path_str:
            raise RuntimeError("Database file path unknown")
        target_path = Path(target_path_str)

        snapshot = await self._snapshots.find_by_id(req.snapshot_id)
        if not snapshot or snapshot.get("database_id") != str(req.database_id):
            raise FileNotFoundError("Snapshot not found")
        object_key = str(snapshot.get("object_key"))

        # Acquire lock for overwrite
        lock_res = f"db:{req.database_id}:restore"
        token = await self._locks.acquire_lock(lock_res, timeout_seconds=30)
        if not token:
            raise TimeoutError("Could not acquire restore lock")

        try:
            data = await self._storage.download_database(object_key)

            # Always use the parent directory for temporary workspace,
            # even when target_path is a directory. We must not extract
            # inside the directory we plan to overwrite.
            parent = target_path.parent
            parent.mkdir(parents=True, exist_ok=True)

            # Prepare temp workspace under the same parent FS
            tmp_dir = Path(tempfile.mkdtemp(prefix="restore_", dir=str(parent)))

            try:
                # If tar.gz (by extension heuristic), extract
                if object_key.endswith(".tar.gz"):
                    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
                        tar.extractall(tmp_dir)
                    # Find first-level directory in tmp_dir
                    entries = [p for p in tmp_dir.iterdir()]
                    # Choose the single root if present, else tmp_dir as content root
                    content_root: Path = entries[0] if len(entries) == 1 else tmp_dir

                    if target_path.is_dir() or not target_path.suffix:
                        # Overwrite directory atomically
                        backup = target_path.with_name(target_path.name + f".bak_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}")
                        if target_path.exists():
                            os.replace(str(target_path), str(backup))
                        os.replace(str(content_root), str(target_path))
                        # Cleanup backup best-effort
                        if backup.exists():
                            try:
                                if backup.is_dir():
                                    for root, dirs, files in os.walk(backup, topdown=False):
                                        for f in files:
                                            Path(root, f).unlink(missing_ok=True)
                                        for d in dirs:
                                            Path(root, d).rmdir()
                                    backup.rmdir()
                                else:
                                    backup.unlink(missing_ok=True)
                            except Exception:  # noqa: BLE001
                                pass
                    else:
                        # target is a file path, move the expected file into place
                        # try to locate a file named like the target file in content_root
                        candidate = content_root / target_path.name
                        if not candidate.exists():
                            # fallback: if content_root is a dir with single file, use it
                            files = list(content_root.rglob("*"))
                            file_candidates = [f for f in files if f.is_file()]
                            if len(file_candidates) == 1:
                                candidate = file_candidates[0]
                            else:
                                raise RuntimeError("Snapshot archive format unsupported for file target")
                        tmp_target = target_path.with_suffix(target_path.suffix + ".tmp")
                        os.replace(str(candidate), str(tmp_target))
                        os.replace(str(tmp_target), str(target_path))
                else:
                    # Raw file snapshot
                    tmp_file = target_path.with_suffix(target_path.suffix + ".tmp")
                    tmp_file.parent.mkdir(parents=True, exist_ok=True)
                    tmp_file.write_bytes(data)
                    os.replace(str(tmp_file), str(target_path))
            finally:
                # Cleanup temp dir
                if tmp_dir.exists():
                    try:
                        for root, dirs, files in os.walk(tmp_dir, topdown=False):
                            for f in files:
                                Path(root, f).unlink(missing_ok=True)
                            for d in dirs:
                                Path(root, d).rmdir()
                        tmp_dir.rmdir()
                    except Exception:  # noqa: BLE001
                        pass

            await self._cache.delete(f"db_info:{req.database_id}")
            return RestoreDatabaseFromSnapshotResponse(
                restored=True,
                database_id=req.database_id,
                mode="overwrite",
                restored_at=datetime.utcnow().isoformat(),
            )
        finally:
            await self._locks.release_lock(lock_res, token)
