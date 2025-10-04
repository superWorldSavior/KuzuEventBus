"""Create branch use case - orchestrates snapshot + provision + restore."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from src.application.dtos.branching import CreateBranchRequest, CreateBranchResponse
from src.application.usecases.create_database_snapshot import (
    CreateDatabaseSnapshotUseCase,
    CreateDatabaseSnapshotRequest,
)
from src.application.usecases.provision_tenant_resources import (
    ProvisionTenantResourcesUseCase,
    ProvisionTenantResourcesRequest,
)
from src.application.usecases.restore_database_from_snapshot import (
    RestoreDatabaseFromSnapshotUseCase,
    RestoreDatabaseFromSnapshotRequest,
)
from src.domain.branching import BranchName
from src.infrastructure.logging.config import get_logger
from src.domain.shared.ports import CacheService, EventService
from src.domain.shared.ports.database_management import (
    KuzuDatabaseRepository,
    SnapshotRepository,
    FileStorageService,
    KuzuQueryService,
)
from src.domain.shared.ports.query_execution import DistributedLockService

logger = get_logger("create_branch_uc")


class CreateBranchUseCase:
    """
    Creates an isolated branch from an existing database.
    
    Orchestrates:
    1. Create snapshot of source database
    2. Provision new database for branch
    3. Restore snapshot into branch database
    """
    
    def __init__(
        self,
        snapshot_uc: CreateDatabaseSnapshotUseCase,
        provision_uc: ProvisionTenantResourcesUseCase,
        restore_uc: RestoreDatabaseFromSnapshotUseCase,
        # Optional deps for PITR branch from timestamp
        db_repo: KuzuDatabaseRepository | None = None,
        snapshots: SnapshotRepository | None = None,
        storage: FileStorageService | None = None,
        locks: DistributedLockService | None = None,
        cache: CacheService | None = None,
        kuzu: KuzuQueryService | None = None,
        events: EventService | None = None,
    ):
        self._snapshot_uc = snapshot_uc
        self._provision_uc = provision_uc
        self._restore_uc = restore_uc
        self._events = events
        # Optional deps for PITR
        self._dbs = db_repo
        self._snapshots = snapshots
        self._storage = storage
        self._locks = locks
        self._cache = cache
        self._kuzu = kuzu
    
    async def execute(self, request: CreateBranchRequest) -> CreateBranchResponse:
        """Create a branch from source database."""
        logger.info(
            "Creating branch",
            source=request.source_database_name,
            branch=request.branch_name,
            tenant_id=str(request.tenant_id),
        )
        
        # Validate branch name
        try:
            branch_name_vo = BranchName(request.branch_name)
        except ValueError as e:
            raise ValueError(f"Invalid branch name: {e}") from e
        
        # 1. Determine base snapshot (source DB) and capture its storage metadata
        # We'll duplicate the snapshot metadata under the BRANCH database before restore
        snapshot_id: UUID  # source snapshot id (for logging)
        src_snap_meta: dict | None = None
        if request.from_snapshot == "latest" or not request.from_snapshot:
            logger.info("Creating snapshot of source database")
            snap_result = await self._snapshot_uc.execute(
                CreateDatabaseSnapshotRequest(
                    tenant_id=request.tenant_id,
                    database_id=request.source_database_id,
                )
            )
            snapshot_id = snap_result.snapshot_id
            logger.info(f"Snapshot created: {snapshot_id}")
            # Capture meta from use case response
            src_snap_meta = {
                "object_key": snap_result.object_key,
                "checksum": snap_result.checksum,
                "size_bytes": snap_result.size_bytes,
                "created_at": snap_result.created_at,
            }
        else:
            # Distinguish between UUID (existing snapshot) vs ISO timestamp (PITR)
            # Try parsing as UUID first (explicit format check)
            is_uuid = False
            try:
                snapshot_id = UUID(request.from_snapshot)
                is_uuid = True
            except (ValueError, AttributeError):
                pass
            
            if is_uuid:
                # Mode 2: Use existing snapshot by UUID
                logger.info(f"Using existing snapshot: {snapshot_id}")
                if not self._snapshots:
                    raise ValueError("Snapshot repository not configured")
                src = await self._snapshots.find_by_id(snapshot_id)
                if not src:
                    raise ValueError(f"Snapshot {snapshot_id} not found")
                src_snap_meta = {
                    "object_key": src.get("object_key"),
                    "checksum": src.get("checksum"),
                    "size_bytes": int(src.get("size_bytes", 0)),
                    "created_at": src.get("created_at"),
                }
            else:
                # Mode 3: Timestamp-based (PITR clone)
                if not all([self._snapshots, self._storage, self._locks, self._cache, self._kuzu, self._dbs]):
                    raise ValueError("Timestamp-based branch creation requires PITR dependencies")

                try:
                    # Accept timezone-aware ISO strings
                    target_ts = datetime.fromisoformat(request.from_snapshot)
                    if target_ts.tzinfo is None:
                        # Assume UTC if naive
                        target_ts = target_ts.replace(tzinfo=timezone.utc)
                except Exception as e:
                    raise ValueError("Invalid from_snapshot format. Use 'latest', snapshot UUID, or ISO timestamp") from e

                # Find nearest snapshot BEFORE target_ts for the SOURCE database
                all_snaps = await self._snapshots.list_by_database(request.source_database_id)
                def _to_dt(s: dict) -> datetime:
                    d = s.get("created_at")
                    return datetime.fromisoformat(d) if isinstance(d, str) else datetime.min
                valid = [s for s in all_snaps if _to_dt(s) <= target_ts]
                if not valid:
                    raise ValueError(f"No snapshot found before {target_ts.isoformat()}")
                nearest = max(valid, key=lambda s: _to_dt(s))
                snapshot_id = UUID(str(nearest.get("id")))
                base_snapshot_time = _to_dt(nearest)
                logger.info("Nearest snapshot found", snapshot_id=str(snapshot_id), created_at=base_snapshot_time.isoformat())
                # Meta for duplication
                src_snap_meta = {
                    "object_key": nearest.get("object_key"),
                    "checksum": nearest.get("checksum"),
                    "size_bytes": int(nearest.get("size_bytes", 0)),
                    "created_at": nearest.get("created_at"),
                }
        
        # 2. Create new database for branch
        full_branch_name = branch_name_vo.to_full_name(request.source_database_name)
        logger.info(f"Provisioning branch database: {full_branch_name}")
        
        provision_result = await self._provision_uc.execute(
            ProvisionTenantResourcesRequest(
                tenant_id=request.tenant_id,
                database_name=full_branch_name,
            )
        )
        branch_db_id = provision_result.database_id
        logger.info(f"Branch database provisioned: {branch_db_id}")
        
        # 3. Duplicate snapshot metadata under BRANCH DB for ownership & audit (all modes)
        if not self._snapshots:
            raise ValueError("Snapshot repository not available")
        if not src_snap_meta:
            raise ValueError("Source snapshot metadata unavailable for duplication")

        origin_snapshot_id = snapshot_id
        branch_snapshot_id = await self._snapshots.save(
            tenant_id=request.tenant_id,
            database_id=branch_db_id,
            object_key=str(src_snap_meta.get("object_key")),
            checksum=str(src_snap_meta.get("checksum")),
            size_bytes=int(src_snap_meta.get("size_bytes", 0)),
            created_at=str(src_snap_meta.get("created_at")),
        )

        # 4. Restore snapshot into branch
        logger.info(f"Restoring snapshot {branch_snapshot_id} into branch")
        await self._restore_uc.execute(
            RestoreDatabaseFromSnapshotRequest(
                tenant_id=request.tenant_id,
                database_id=branch_db_id,
                snapshot_id=branch_snapshot_id,
            )
        )
        logger.info("Snapshot restored successfully")

        # If timestamp mode was used, replay WAL from SOURCE into BRANCH up to target_ts
        if 'target_ts' in locals():
            # Resolve branch target path
            info = await self._dbs.find_by_id(branch_db_id)
            if not info or info.get("tenant_id") != str(request.tenant_id):
                raise FileNotFoundError("Branch database not found after provision")
            target_path = info.get("file_path") or info.get("path")
            if not target_path:
                raise RuntimeError("Branch database file path unknown")

            # List WAL files in range [base_snapshot_time, target_ts] for SOURCE
            prefix = f"tenants/{request.tenant_id}/{request.source_database_id}/wal/"
            try:
                wal_objects = await self._storage.list_objects(prefix)
            except Exception as e:
                logger.warning(f"No WAL files found: {e}")
                wal_objects = []

            wal_files: list[dict] = []
            from datetime import datetime as _dt
            for obj in wal_objects:
                filename = obj.get("key", "").split("/")[-1]
                if not filename.startswith("wal-") or not filename.endswith(".log"):
                    continue
                try:
                    ts_str = filename.replace("wal-", "").replace(".log", "")
                    ts = _dt.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                    if base_snapshot_time <= ts <= target_ts:
                        wal_files.append({
                            "key": obj.get("key"),
                            "timestamp": ts,
                            "size": obj.get("size", 0),
                        })
                except Exception:
                    logger.warning(f"Invalid WAL filename format: {filename}")
                    continue

            wal_files = sorted(wal_files, key=lambda w: w["timestamp"]) 

            # Replay
            replayed = 0
            import json
            for wal in wal_files:
                try:
                    data = await self._storage.download_database(wal["key"])  # returns bytes
                    text = data.decode("utf-8", errors="ignore")
                    for line in text.splitlines():
                        if not line.strip():
                            continue
                        try:
                            entry = json.loads(line)
                            q = entry.get("query", "")
                            if not q:
                                continue
                            # Stop if entry timestamp beyond target
                            ts_entry = entry.get("ts")
                            if ts_entry:
                                try:
                                    ts_e = datetime.fromisoformat(ts_entry)
                                    if ts_e.tzinfo is None:
                                        ts_e = ts_e.replace(tzinfo=timezone.utc)
                                    if ts_e > target_ts:
                                        break
                                except Exception:
                                    pass
                            async for _ in self._kuzu.execute_query(
                                database_path=str(target_path),
                                query=q,
                            ):
                                pass
                            replayed += 1
                        except Exception as per_entry_err:  # noqa: BLE001
                            logger.warning("WAL entry failed during replay (ignored)", error=str(per_entry_err), wal_key=wal.get("key"))
                            continue
                except Exception as e:
                    logger.error(f"Failed to process WAL {wal['key']}: {e}")
                    continue
            # Invalidate cache for branch DB
            if self._cache:
                await self._cache.delete(f"db_info:{branch_db_id}")
            logger.info("PITR WAL replay completed", replayed=replayed)
        
        created_at = datetime.utcnow().isoformat() + "Z"
        
        logger.info("Branch created successfully", branch=full_branch_name)
        
        # Emit branch created event
        if self._events:
            try:
                await self._events.emit_event(
                    tenant_id=request.tenant_id,
                    event_type="branch_created",
                    title="Branch Created",
                    message=f"Branch '{full_branch_name}' created from '{request.source_database_name}'",
                    metadata={
                        "branch_name": request.branch_name,
                        "full_name": full_branch_name,
                        "parent_database": request.source_database_name,
                        "branch_database_id": str(branch_db_id),
                        "snapshot_id": str(branch_snapshot_id),
                    },
                )
            except Exception:
                pass  # Best-effort
        
        return CreateBranchResponse(
            branch_name=request.branch_name,
            full_name=full_branch_name,
            parent_database_name=request.source_database_name,
            branch_database_id=branch_db_id,
            snapshot_id=branch_snapshot_id,
            created_at=created_at,
            description=request.description,
            origin_snapshot_id=origin_snapshot_id,
        )
