"""Preview Database PITR state without modifying the main database.

Restores to a temporary location and executes a read query to preview the state.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
import tempfile
import shutil
import tarfile
import io
import json
from pathlib import Path

from src.domain.shared.ports import AuthorizationService
from src.domain.shared.ports.database_management import (
    SnapshotRepository,
    FileStorageService,
    KuzuDatabaseRepository,
)
from src.infrastructure.logging.config import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class PreviewDatabasePITRRequest:
    tenant_id: UUID
    database_id: UUID
    target_timestamp: datetime
    preview_query: Optional[str] = None  # Default: MATCH (n) RETURN n LIMIT 100


@dataclass(frozen=True)
class PreviewDatabasePITRResponse:
    database_id: UUID
    target_timestamp: str
    snapshot_used: str
    wal_files_replayed: int
    preview_query: str
    results: List[Dict[str, Any]]
    rows_returned: int
    previewed_at: str


class PreviewDatabasePITRUseCase:
    """Preview database state at a point in time without modifying the main DB."""

    def __init__(
        self,
        authz: AuthorizationService,
        db_repo: KuzuDatabaseRepository,
        snapshots: SnapshotRepository,
        storage: FileStorageService,
    ) -> None:
        self._authz = authz
        self._db_repo = db_repo
        self._snapshots = snapshots
        self._storage = storage

    async def execute(self, req: PreviewDatabasePITRRequest) -> PreviewDatabasePITRResponse:
        """Preview database at target timestamp in a temporary location."""
        allowed = await self._authz.check_permission(req.tenant_id, "database", "read")
        if not allowed:
            raise PermissionError("Not authorized to preview database")

        # 1. Find nearest snapshot before target
        all_snapshots = await self._snapshots.list_by_database(req.database_id, req.tenant_id)
        snapshot = self._find_nearest_snapshot(all_snapshots, req.target_timestamp)
        
        if not snapshot:
            raise FileNotFoundError(
                f"No snapshot found before {req.target_timestamp.isoformat()}"
            )

        snapshot_time = datetime.fromisoformat(snapshot["created_at"])
        
        # 2. Find WAL files to replay
        wal_prefix = f"tenants/{req.tenant_id}/{req.database_id}/wal/"
        wal_objects = await self._storage.list_objects(wal_prefix)
        
        wal_files = []
        for obj in wal_objects:
            key = obj.get("key", "")
            filename = key.split("/")[-1]
            if not filename.startswith("wal-") or not filename.endswith(".log"):
                continue
            
            ts_str = filename.replace("wal-", "").replace(".log", "")
            try:
                from datetime import timezone
                ts = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            
            if snapshot_time <= ts <= req.target_timestamp:
                wal_files.append({"key": key, "timestamp": ts})
        
        # Sort by timestamp
        wal_files.sort(key=lambda x: x["timestamp"])
        
        # 3. Restore to temporary location
        tmp_dir = Path(tempfile.mkdtemp(prefix="pitr_preview_"))
        db_path = tmp_dir / "preview.kuzu"
        
        try:
            # Restore snapshot
            await self._restore_snapshot(snapshot, db_path)
            
            # Replay WAL files
            for wf in wal_files:
                await self._replay_wal_file(wf["key"], db_path, req.target_timestamp)
            
            # 4. Execute preview query
            preview_query = req.preview_query or "MATCH (n) RETURN n LIMIT 100"
            results = await self._execute_preview_query(db_path, preview_query)
            
            return PreviewDatabasePITRResponse(
                database_id=req.database_id,
                target_timestamp=req.target_timestamp.isoformat(),
                snapshot_used=snapshot["object_key"],
                wal_files_replayed=len(wal_files),
                preview_query=preview_query,
                results=results,
                rows_returned=len(results),
                previewed_at=datetime.utcnow().isoformat(),
            )
        
        finally:
            # Cleanup temporary directory
            try:
                shutil.rmtree(str(tmp_dir))
            except Exception as e:
                logger.warning("Failed to cleanup temp preview dir", error=str(e))

    async def _restore_snapshot(self, snapshot: dict, target_path: Path) -> None:
        """Restore snapshot to target path."""
        object_key = snapshot["object_key"]
        data = await self._storage.download_database(object_key)
        
        if object_key.endswith(".tar.gz"):
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
                tar.extractall(target_path.parent)
            
            # Find extracted directory and move to target
            extracted = list(target_path.parent.glob("*"))
            for item in extracted:
                if item.is_dir() and item != target_path:
                    # Look for data.kuzu inside
                    data_kuzu = item / "data.kuzu"
                    if data_kuzu.exists():
                        shutil.move(str(data_kuzu), str(target_path))
                        break
        else:
            # Direct file
            target_path.write_bytes(data)

    async def _replay_wal_file(
        self, 
        wal_key: str, 
        db_path: Path, 
        target_timestamp: datetime
    ) -> None:
        """Replay WAL entries up to target timestamp."""
        try:
            data = await self._storage.download_database(wal_key)
            text = data.decode("utf-8", errors="ignore")
            
            for line in text.splitlines():
                if not line.strip():
                    continue
                
                try:
                    entry = json.loads(line)
                    entry_ts = datetime.fromisoformat(entry.get("ts", ""))
                    
                    if entry_ts > target_timestamp:
                        break
                    
                    query = entry.get("query", "")
                    if query:
                        # Execute query on preview DB
                        await self._execute_on_preview_db(db_path, query)
                
                except Exception as e:
                    logger.warning("Failed to replay WAL entry", error=str(e), entry=entry, traceback=True)
        
        except Exception as e:
            logger.error("Failed to replay WAL file", wal_key=wal_key, error=str(e), exc_info=True)

    async def _execute_on_preview_db(self, db_path: Path, query: str) -> None:
        """Execute a mutation query on the preview database."""
        import kuzu
        
        db = kuzu.Database(str(db_path))
        conn = kuzu.Connection(db)
        
        try:
            conn.execute(query)
        finally:
            del conn
            del db

    async def _execute_preview_query(
        self, 
        db_path: Path, 
        query: str
    ) -> List[Dict[str, Any]]:
        """Execute a read query on the preview database and return results."""
        import kuzu
        
        db = kuzu.Database(str(db_path))
        conn = kuzu.Connection(db)
        
        try:
            result = conn.execute(query)
            rows = []
            
            # Convert Kuzu results to JSON-serializable format
            while result.has_next():
                row = result.get_next()
                row_dict = {}
                
                for i, col_name in enumerate(result.get_column_names()):
                    value = row[i]
                    # Convert kuzu types to JSON-serializable
                    if hasattr(value, '__dict__'):
                        row_dict[col_name] = str(value)
                    else:
                        row_dict[col_name] = value
                
                rows.append(row_dict)
            
            return rows
        
        finally:
            del conn
            del db

    @staticmethod
    def _find_nearest_snapshot(
        snapshots: List[Dict[str, Any]], 
        target: datetime
    ) -> Optional[Dict[str, Any]]:
        """Find the most recent snapshot before target timestamp."""
        candidates = []
        
        for s in snapshots:
            try:
                created_at = datetime.fromisoformat(str(s.get("created_at")))
            except Exception:
                continue
            
            if created_at <= target:
                candidates.append((created_at, s))
        
        if not candidates:
            return None
        
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]
