"""Point-In-Time Recovery (PITR) for Kuzu databases.

Restores database to specific timestamp using:
1. Nearest snapshot before target timestamp
2. Replay of WAL files until target timestamp
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import UUID
import io
import os
import tarfile
import tempfile
import json
from dataclasses import dataclass

from src.domain.shared.ports import AuthorizationService, CacheService
from src.domain.shared.ports.database_management import (
    KuzuDatabaseRepository,
    SnapshotRepository,
    FileStorageService,
    KuzuQueryService,
)
from src.domain.shared.ports.query_execution import DistributedLockService
from src.infrastructure.logging.config import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class RestoreDatabasePITRRequest:
    tenant_id: UUID
    database_id: UUID
    target_timestamp: datetime  # ISO format with timezone


@dataclass(frozen=True)
class RestoreDatabasePITRResponse:
    restored: bool
    database_id: UUID
    target_timestamp: str
    snapshot_used: str
    wal_files_replayed: int
    restored_at: str


class RestoreDatabasePITRUseCase:
    """Restore database to specific point in time using snapshots + WAL replay."""
    
    def __init__(
        self,
        authz: AuthorizationService,
        db_repo: KuzuDatabaseRepository,
        snapshots: SnapshotRepository,
        storage: FileStorageService,
        locks: DistributedLockService,
        cache: CacheService,
        kuzu: KuzuQueryService,
    ) -> None:
        self._authz = authz
        self._dbs = db_repo
        self._snapshots = snapshots
        self._storage = storage
        self._locks = locks
        self._cache = cache
        self._kuzu = kuzu

    async def execute(self, req: RestoreDatabasePITRRequest) -> RestoreDatabasePITRResponse:
        """Execute PITR restore to specific timestamp."""
        allowed = await self._authz.check_permission(req.tenant_id, "database", "restore")
        if not allowed:
            raise PermissionError("Not authorized to restore database")

        # Validate target timestamp
        if req.target_timestamp > datetime.now(tz=timezone.utc):
            raise ValueError("Cannot restore to future timestamp")

        # Get database info
        info = await self._dbs.find_by_id(req.database_id)
        if not info or info.get("tenant_id") != str(req.tenant_id):
            raise FileNotFoundError("Database not found")
        target_path_str = info.get("file_path") or info.get("path")
        if not target_path_str:
            raise RuntimeError("Database file path unknown")
        target_path = Path(target_path_str)

        # Find nearest snapshot before target timestamp
        snapshot = await self._find_nearest_snapshot(
            req.database_id, 
            req.target_timestamp
        )
        if not snapshot:
            raise FileNotFoundError(
                f"No snapshot found before {req.target_timestamp.isoformat()}"
            )

        # Acquire lock for restore
        lock_res = f"db:{req.database_id}:pitr_restore"
        token = await self._locks.acquire_lock(lock_res, timeout_seconds=60)
        if not token:
            raise TimeoutError("Could not acquire PITR restore lock")

        wal_count = 0
        try:
            logger.info(
                "PITR restore started",
                database_id=str(req.database_id),
                target_timestamp=req.target_timestamp.isoformat(),
                snapshot_id=snapshot.get("id"),
            )

            # Step 1: Restore base snapshot
            await self._restore_snapshot(
                snapshot=snapshot,
                target_path=target_path,
                database_id=req.database_id,
            )

            # Step 2: Find and replay WAL files
            snapshot_time = datetime.fromisoformat(snapshot.get("created_at"))
            wal_files = await self._find_wal_files_in_range(
                tenant_id=req.tenant_id,
                database_id=req.database_id,
                start_time=snapshot_time,
                end_time=req.target_timestamp,
            )

            if wal_files:
                wal_count = await self._replay_wal_files(
                    wal_files=wal_files,
                    target_path=target_path,
                    target_timestamp=req.target_timestamp,
                )

            # Invalidate cache
            await self._cache.delete(f"db_info:{req.database_id}")

            logger.info(
                "PITR restore completed",
                database_id=str(req.database_id),
                wal_replayed=wal_count,
            )

            return RestoreDatabasePITRResponse(
                restored=True,
                database_id=req.database_id,
                target_timestamp=req.target_timestamp.isoformat(),
                snapshot_used=str(snapshot.get("id")),
                wal_files_replayed=wal_count,
                restored_at=datetime.now(tz=timezone.utc).isoformat(),
            )
        finally:
            await self._locks.release_lock(lock_res, token)

    async def _find_nearest_snapshot(
        self,
        database_id: UUID,
        target_timestamp: datetime,
    ) -> Optional[dict]:
        """Find most recent snapshot before target timestamp."""
        # Get all snapshots for database
        all_snapshots = await self._snapshots.list_by_database(database_id)
        
        # Filter snapshots before target timestamp
        valid_snapshots = [
            snap for snap in all_snapshots
            if datetime.fromisoformat(snap.get("created_at")) <= target_timestamp
        ]
        
        if not valid_snapshots:
            return None
        
        # Return most recent
        return max(
            valid_snapshots,
            key=lambda s: datetime.fromisoformat(s.get("created_at"))
        )

    async def _restore_snapshot(
        self,
        snapshot: dict,
        target_path: Path,
        database_id: UUID,
    ) -> None:
        """Restore snapshot to target path."""
        object_key = str(snapshot.get("object_key"))
        data = await self._storage.download_database(object_key)

        parent = target_path.parent
        parent.mkdir(parents=True, exist_ok=True)
        tmp_dir = Path(tempfile.mkdtemp(prefix="pitr_restore_", dir=str(parent)))

        try:
            if object_key.endswith(".tar.gz"):
                with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
                    tar.extractall(tmp_dir)

                # Strict validation: expect exactly one top-level directory named as the
                # database directory (database_id), containing data.kuzu
                target_dir = target_path.parent
                expected_root_name = target_dir.name

                top_level_dirs = [p for p in tmp_dir.iterdir() if p.is_dir()]
                if len(top_level_dirs) != 1:
                    raise ValueError(
                        "Invalid snapshot layout: expected a single top-level directory"
                    )
                content_root = top_level_dirs[0]
                if content_root.name != expected_root_name:
                    raise ValueError(
                        f"Invalid snapshot root directory: expected '{expected_root_name}', got '{content_root.name}'"
                    )

                # Detect source directory to promote:
                # - case A: kuzu file(s) directly under content_root
                # - case B: single nested directory that contains kuzu file(s)
                def has_kuzu_file(path: Path) -> bool:
                    try:
                        for p in path.iterdir():
                            if p.is_file() and p.suffix == ".kuzu":
                                return True
                        return False
                    except Exception:
                        return False

                source_dir = content_root
                if not has_kuzu_file(content_root):
                    # try single nested directory
                    subdirs = [p for p in content_root.iterdir() if p.is_dir()]
                    if len(subdirs) == 1 and has_kuzu_file(subdirs[0]):
                        source_dir = subdirs[0]
                    else:
                        raise ValueError(
                            "Invalid snapshot content: expected '*.kuzu' file at root or in single subdirectory"
                        )

                # Atomic replace of the DATABASE DIRECTORY containing data.kuzu
                backup_dir = target_dir.with_name(
                    target_dir.name + f".pitr_bak_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}"
                )
                staged_dir = target_dir.with_name(
                    target_dir.name + f".pitr_stage_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}"
                )
                # Ensure parent exists
                target_dir.parent.mkdir(parents=True, exist_ok=True)
                # Stage extracted content to sibling path (same filesystem)
                os.replace(str(source_dir), str(staged_dir))
                # Backup current target if exists, then promote staged -> target
                if target_dir.exists():
                    os.replace(str(target_dir), str(backup_dir))
                os.replace(str(staged_dir), str(target_dir))
            else:
                # Raw file
                tmp_file = target_path.with_suffix(target_path.suffix + ".tmp")
                tmp_file.write_bytes(data)
                os.replace(str(tmp_file), str(target_path))
        finally:
            # Cleanup
            if tmp_dir.exists():
                for root, dirs, files in os.walk(tmp_dir, topdown=False):
                    for f in files:
                        Path(root, f).unlink(missing_ok=True)
                    for d in dirs:
                        Path(root, d).rmdir()
                tmp_dir.rmdir()

    async def _find_wal_files_in_range(
        self,
        tenant_id: UUID,
        database_id: UUID,
        start_time: datetime,
        end_time: datetime,
    ) -> list[dict]:
        """Find all archived WAL files in timestamp range.
        
        WAL files are stored in MinIO with naming convention:
        tenants/{tenant_id}/{database_id}/wal/wal-{timestamp}.log
        """
        # List all WAL files for this database
        prefix = f"tenants/{tenant_id}/{database_id}/wal/"
        
        try:
            wal_objects = await self._storage.list_objects(prefix)
        except Exception as e:
            logger.warning(f"No WAL files found: {e}")
            return []

        # Filter by timestamp range
        wal_files = []
        for obj in wal_objects:
            # Extract timestamp from filename: wal-20250101T143000Z.log
            filename = obj.get("key", "").split("/")[-1]
            if not filename.startswith("wal-"):
                continue
            
            try:
                # Parse timestamp from filename
                ts_str = filename.replace("wal-", "").replace(".log", "")
                ts = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                
                if start_time <= ts <= end_time:
                    wal_files.append({
                        "key": obj.get("key"),
                        "timestamp": ts,
                        "size": obj.get("size", 0),
                    })
            except ValueError:
                logger.warning(f"Invalid WAL filename format: {filename}")
                continue

        # Sort by timestamp
        return sorted(wal_files, key=lambda w: w["timestamp"])

    async def _replay_wal_files(
        self,
        wal_files: list[dict],
        target_path: Path,
        target_timestamp: datetime,
    ) -> int:
        """Replay WAL files to restore database to target timestamp.

        WAL files contain JSON-lines entries: {"ts", "query", "parameters"}.
        We execute queries sequentially until reaching target_timestamp.
        """
        logger.info(
            "Replaying WAL files",
            count=len(wal_files),
            target=target_timestamp.isoformat(),
        )

        replayed_count = 0
        for wal_file in wal_files:
            try:
                wal_data = await self._storage.download_database(wal_file["key"])
                text = wal_data.decode("utf-8", errors="ignore")

                for line in text.splitlines():
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                        ts = datetime.fromisoformat(entry.get("ts"))
                        if ts > target_timestamp:
                            logger.info("Reached target timestamp during WAL replay")
                            return replayed_count

                        query = entry.get("query", "")
                        if not query:
                            continue

                        # Exécuter la mutation sur la base cible via KuzuQueryService
                        async for _ in self._kuzu.execute_query(
                            database_path=str(target_path),
                            query=query,
                        ):
                            pass
                        replayed_count += 1
                    except Exception as per_entry_err:  # noqa: BLE001
                        # Idempotence / conflits tolérés en replay
                        logger.warning(
                            "WAL entry failed during replay (ignored)",
                            error=str(per_entry_err),
                            wal_key=wal_file.get("key"),
                        )
                        continue
            except Exception as e:  # noqa: BLE001
                logger.error(f"Failed to process WAL {wal_file['key']}: {e}")
                continue

        logger.info(f"Successfully replayed {replayed_count} WAL entries")
        return replayed_count
