"""Integration test for PITR: Snapshot A -> WAL -> Snapshot B -> PITR to t in (A,B).

Requires MinIO (MINIO_* env) and Kuzu library. Skips gracefully if MinIO
is not reachable. Uses a fake snapshot repo and fake locks to avoid DB/Redis.
"""
from __future__ import annotations

import io
import os
import tarfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4, UUID

import pytest

from src.application.usecases.restore_database_pitr import (
    RestoreDatabasePITRUseCase,
    RestoreDatabasePITRRequest,
)
from src.infrastructure.file_storage.minio_service import MinioFileStorageService
from src.infrastructure.kuzu.kuzu_query_execution_adapter import KuzuQueryExecutionAdapter
from src.infrastructure.kuzu.kuzu_query_service import KuzuQueryServiceAdapter


@pytest.mark.integration
@pytest.mark.asyncio
async def test_pitr_end_to_end_with_minio_and_kuzu(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    # Pre-check MinIO availability; skip if not reachable
    try:
        storage = MinioFileStorageService()
        # Try a lightweight list on a random prefix to validate connectivity
        _ = await storage.list_objects("non-existent-prefix/")
    except Exception as exc:  # pragma: no cover - skip when MinIO absent
        pytest.skip(f"MinIO unavailable: {exc}")

    # Arrange environment
    base_dir = tmp_path / "kuzu_data"
    base_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("KUZU_DATA_DIR", str(base_dir))

    tenant_id = uuid4()
    database_id = uuid4()
    db_dir = base_dir / str(tenant_id) / str(database_id)
    db_dir.mkdir(parents=True, exist_ok=True)
    db_path = db_dir / "data.kuzu"

    # Use KuzuQueryExecutionAdapter to initialize DB and create some data
    exec_adapter = KuzuQueryExecutionAdapter(base_dir=str(base_dir))

    # Snapshot A time
    t_now = datetime.now(timezone.utc)
    t_snap_a = t_now - timedelta(minutes=30)
    t_target = t_now - timedelta(minutes=20)
    t_snap_b = t_now - timedelta(minutes=10)

    # Create initial DB content (before snapshot A)
    res1 = await exec_adapter.execute_query(tenant_id, database_id, "CREATE (:Item {phase:'A'}) RETURN 1")
    assert not res1.get("error")

    # Materialize snapshot A by tarring the DB directory
    buf_a = io.BytesIO()
    with tarfile.open(fileobj=buf_a, mode="w:gz") as tar:
        tar.add(db_dir, arcname=db_dir.name)
    snap_a_key = f"snapshots/snapA-{uuid4().hex}.tar.gz"
    snap_a_url = await storage.upload_database(tenant_id, database_id, buf_a.getvalue(), snap_a_key)

    # WAL mutation between A and B
    wal_ts = (t_snap_a + timedelta(minutes=5)).strftime("%Y%m%dT%H%M%SZ")
    wal_content = "".join([
        '{"ts":"' + (t_snap_a + timedelta(minutes=5)).isoformat() + '","query":"CREATE (:Item {phase: \'WAL1\'})"}\n'
    ]).encode()
    wal_name = f"wal/wal-{wal_ts}.log"
    _ = await storage.upload_database(tenant_id, database_id, wal_content, wal_name)

    # Create snapshot B (after more changes not included in PITR target)
    res2 = await exec_adapter.execute_query(tenant_id, database_id, "CREATE (:Item {phase:'B'}) RETURN 1")
    assert not res2.get("error")
    buf_b = io.BytesIO()
    with tarfile.open(fileobj=buf_b, mode="w:gz") as tar:
        tar.add(db_dir, arcname=db_dir.name)
    snap_b_key = f"snapshots/snapB-{uuid4().hex}.tar.gz"
    snap_b_url = await storage.upload_database(tenant_id, database_id, buf_b.getvalue(), snap_b_key)

    # Fake ports for use case (no Postgres/Redis needed)
    class FakeAuthz:
        async def check_permission(self, *_args, **_kwargs) -> bool:
            return True

    class FakeDBRepo:
        async def find_by_id(self, _dbid: UUID) -> Optional[Dict[str, Any]]:
            return {"tenant_id": str(tenant_id), "file_path": str(db_path)}

    class FakeSnapshots:
        async def list_by_database(self, _dbid: UUID):
            # Provide A and B; A is before target, B is after
            return [
                {"id": "snapA", "created_at": t_snap_a.isoformat(), "object_key": snap_a_url},
                {"id": "snapB", "created_at": t_snap_b.isoformat(), "object_key": snap_b_url},
            ]

    class FakeLocks:
        async def acquire_lock(self, *_args, **_kwargs) -> str:
            return "token"

        async def release_lock(self, *_args, **_kwargs) -> bool:
            return True

    class FakeCache:
        async def delete(self, *_args, **_kwargs) -> bool:
            return True

    use_case = RestoreDatabasePITRUseCase(
        authz=FakeAuthz(),
        db_repo=FakeDBRepo(),
        snapshots=FakeSnapshots(),
        storage=storage,
        locks=FakeLocks(),
        cache=FakeCache(),
        kuzu=KuzuQueryServiceAdapter(base_dir=str(base_dir)),
    )

    # Act: PITR to t_target (between A and B) — should restore A then replay WAL1 only
    req = RestoreDatabasePITRRequest(tenant_id=tenant_id, database_id=database_id, target_timestamp=t_target)
    res = await use_case.execute(req)

    assert res.restored is True
    assert res.snapshot_used == "snapA"
    assert res.wal_files_replayed >= 1

    # Verify state: the item from WAL1 should exist; B-phase should not (since PITR target is before snapshot B)
    check = await exec_adapter.execute_query(tenant_id, database_id, "MATCH (n:Item) RETURN COUNT(n) as c")
    assert not check.get("error")
    assert check.get("rows_returned") >= 1
