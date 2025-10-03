"""List Database PITR timeline and optional restore plan.

Aggregates snapshots and WAL files over a time range and (optionally)
computes the plan to restore to a given target timestamp.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from collections import defaultdict
import json

from src.domain.shared.ports import AuthorizationService
from src.domain.shared.ports.database_management import (
    SnapshotRepository,
    FileStorageService,
)
from src.infrastructure.logging.config import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class ListDatabasePITRRequest:
    tenant_id: UUID
    database_id: UUID
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    target_timestamp: Optional[datetime] = None
    window: Optional[str] = "minute"  # 'minute' | 'hour'
    include_types: bool = False
    include_queries: bool = False


class ListDatabasePITRUseCase:
    def __init__(
        self,
        authz: AuthorizationService,
        snapshots: SnapshotRepository,
        storage: FileStorageService,
    ) -> None:
        self._authz = authz
        self._snapshots = snapshots
        self._storage = storage

    async def execute(self, req: ListDatabasePITRRequest) -> Dict[str, Any]:
        allowed = await self._authz.check_permission(req.tenant_id, "database", "read")
        if not allowed:
            raise PermissionError("Not authorized to read database PITR timeline")

        # Use reasonable defaults instead of datetime.min/max which have timezone issues
        now = datetime.now(tz=timezone.utc)
        start = req.start or (now.replace(year=now.year - 1))  # Default: 1 year ago
        end = req.end or now  # Default: now

        # 1) Snapshots
        snaps = await self._snapshots.list_by_database(req.database_id)
        snapshots: List[Dict[str, Any]] = []
        for s in snaps:
            try:
                created_at = datetime.fromisoformat(str(s.get("created_at")))
            except Exception:
                continue
            if not (start <= created_at <= end):
                continue
            snapshots.append(
                {
                    "id": str(s.get("id")),
                    "object_key": str(s.get("object_key")),
                    "checksum": str(s.get("checksum", "")),
                    "size_bytes": int(s.get("size_bytes", 0)),
                    "created_at": created_at.isoformat(),
                }
            )

        # 2) WAL objects
        prefix = f"tenants/{req.tenant_id}/{req.database_id}/wal/"
        objects = await self._storage.list_objects(prefix)

        wal_files: List[Dict[str, Any]] = []
        for obj in objects:
            key = obj.get("key", "")
            filename = key.split("/")[-1]
            if not filename.startswith("wal-") or not filename.endswith(".log"):
                continue
            ts_str = filename.replace("wal-", "").replace(".log", "")
            try:
                ts = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
            except ValueError:
                logger.warning("Invalid WAL filename format", filename=filename)
                continue
            if not (start <= ts <= end):
                continue
            wal_files.append(
                {
                    "key": key,
                    "timestamp": ts.isoformat(),
                    "size": int(obj.get("size", 0)),
                }
            )

        # 3) Group by window and optionally compute query-type breakdown
        window = (req.window or "minute").lower()
        if window not in ("minute", "hour"):
            window = "minute"

        def window_start(ts: datetime) -> datetime:
            if window == "hour":
                return ts.replace(minute=0, second=0, microsecond=0)
            # default minute
            return ts.replace(second=0, microsecond=0)

        windows: Dict[str, Dict[str, Any]] = {}
        # initialize counts per window
        for wf in wal_files:
            ts = datetime.fromisoformat(wf["timestamp"])  # type: ignore[arg-type]
            wstart = window_start(ts).isoformat()
            slot = windows.setdefault(wstart, {"start": wstart, "end": None, "files": 0, "bytes": 0, "types": {}})
            slot["files"] += 1
            slot["bytes"] += int(wf.get("size", 0))

        # compute end = start + window - 1sec
        for wstart, slot in list(windows.items()):
            ts = datetime.fromisoformat(wstart)
            if window == "hour":
                wend = ts.replace(minute=59, second=59, microsecond=0)
            else:
                wend = ts.replace(second=59, microsecond=0)
            slot["end"] = wend.isoformat()

        # Optional: extract queries from WAL files
        if req.include_queries and wal_files:
            # For each window, extract the last query executed
            files_by_window: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
            for wf in wal_files:
                ts = datetime.fromisoformat(wf["timestamp"])  # type: ignore[arg-type]
                wstart = window_start(ts).isoformat()
                files_by_window[wstart].append(wf)

            async def get_last_query_and_results(key: str) -> Optional[Dict[str, Any]]:
                """Extract the last query and its results from a WAL file."""
                try:
                    data = await self._storage.download_database(key)
                    text = data.decode("utf-8", errors="ignore")
                    lines = [line.strip() for line in text.splitlines() if line.strip()]
                    if not lines:
                        return None
                    # Get last line
                    last_line = lines[-1]
                    entry = json.loads(last_line)
                    return {
                        "query": str(entry.get("query", "")),
                        "results": entry.get("results", []),
                        "rows_returned": entry.get("rows_returned", 0),
                    }
                except Exception:
                    return None

            # For each window, get query and results from the latest file
            for wstart, files in files_by_window.items():
                if files:
                    # Sort by timestamp, get last
                    latest_file = max(files, key=lambda f: f["timestamp"])
                    data = await get_last_query_and_results(latest_file["key"])  # type: ignore[arg-type]
                    if data and wstart in windows:
                        windows[wstart]["query"] = data["query"]
                        windows[wstart]["results"] = data["results"]
                        windows[wstart]["rows_returned"] = data["rows_returned"]

        # Optional deeper breakdown: count by query type scanning WAL content
        if req.include_types and wal_files:
            # Build index of files per window
            files_by_window: Dict[str, List[str]] = defaultdict(list)
            for wf in wal_files:
                ts = datetime.fromisoformat(wf["timestamp"])  # type: ignore[arg-type]
                wstart = window_start(ts).isoformat()
                files_by_window[wstart].append(wf["key"])  # type: ignore[index]

            async def classify_file(key: str) -> Dict[str, int]:
                counts: Dict[str, int] = defaultdict(int)
                try:
                    data = await self._storage.download_database(key)
                    text = data.decode("utf-8", errors="ignore")
                    for line in text.splitlines():
                        if not line.strip():
                            continue
                        try:
                            entry = json.loads(line)
                            q = str(entry.get("query", ""))
                            t = self._query_type(q)
                            counts[t] += 1
                        except Exception:
                            continue
                except Exception:
                    pass
                return counts

            # For each window, aggregate
            for wstart, keys in files_by_window.items():
                window_counts: Dict[str, int] = defaultdict(int)
                for key in keys:
                    c = await classify_file(key)
                    for k, v in c.items():
                        window_counts[k] += v
                windows[wstart]["types"] = dict(window_counts)

        # Optional: compute plan to reach target
        plan: Optional[Dict[str, Any]] = None
        if req.target_timestamp is not None:
            # nearest snapshot <= target
            snapshot_used = self._nearest_snapshot_before(snapshots, req.target_timestamp)
            if snapshot_used is None:
                raise FileNotFoundError(
                    f"No snapshot found before {req.target_timestamp.isoformat()}"
                )
            snap_time = datetime.fromisoformat(snapshot_used["created_at"])  # type: ignore[arg-type]
            wal_to_apply = [
                wf
                for wf in wal_files
                if snap_time <= datetime.fromisoformat(wf["timestamp"]) <= req.target_timestamp
            ]
            plan = {
                "target_timestamp": req.target_timestamp.isoformat(),
                "snapshot": snapshot_used,
                "wal_files": wal_to_apply,
                "wal_count": len(wal_to_apply),
                # naive estimate: bytes to read ~ sum sizes
                "estimate": {
                    "bytes_to_read": sum(wf.get("size", 0) for wf in wal_to_apply),
                },
            }

        # Sorted windows by time
        wal_windows = [windows[k] for k in sorted(windows.keys())]

        return {
            "database_id": str(req.database_id),
            "start": start.isoformat(),
            "end": end.isoformat(),
            "snapshots": snapshots,
            "wal_files": wal_files,
            "wal_windows": wal_windows,
            "plan": plan,
        }

    @staticmethod
    def _nearest_snapshot_before(snapshots: List[Dict[str, Any]], target: datetime) -> Optional[Dict[str, Any]]:
        candidates = []
        for s in snapshots:
            try:
                c = datetime.fromisoformat(str(s.get("created_at")))
            except Exception:
                continue
            if c <= target:
                candidates.append((c, s))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    @staticmethod
    def _query_type(query: str) -> str:
        q = query.strip().upper()
        prefixes = [
            ("CREATE", "CREATE"),
            ("MERGE", "MERGE"),
            ("DELETE", "DELETE"),
            ("SET ", "SET"),
            ("DROP", "DROP"),
            ("ALTER", "ALTER"),
            ("INSERT", "INSERT"),
            ("UPDATE", "UPDATE"),
        ]
        for p, label in prefixes:
            if q.startswith(p):
                return label
        return "READ"
