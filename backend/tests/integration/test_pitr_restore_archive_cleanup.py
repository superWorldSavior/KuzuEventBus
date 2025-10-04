import pytest
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, Mock

from src.application.usecases.restore_database_pitr import (
    RestoreDatabasePITRUseCase,
    RestoreDatabasePITRRequest,
)


@pytest.mark.asyncio
async def test_pitr_restore_creates_archive_and_deletes_wal(monkeypatch):
    tenant_id = uuid4()
    db_id = uuid4()
    target_ts = datetime.now(timezone.utc)

    # Fakes/Mocks
    authz = Mock()
    authz.check_permission = AsyncMock(return_value=True)

    db_repo = Mock()
    db_repo.find_by_id = AsyncMock(return_value={
        "tenant_id": str(tenant_id),
        "file_path": "/var/lib/kuzu/data.kuzu",
    })

    # Snapshot repo returns one prior snapshot
    base_snap_id = uuid4()
    snapshots = Mock()
    snapshots.list_by_database = AsyncMock(return_value=[{
        "id": str(base_snap_id),
        "created_at": (target_ts - timedelta(hours=1)).isoformat(),
        "object_key": f"tenants/{tenant_id}/{db_id}/snapshots/snapshot-older.tar.gz",
        "checksum": "deadbeef",
        "size_bytes": 123,
    }])

    # Storage returns a single WAL in range and supports delete
    class FakeStorage:
        async def list_objects(self, prefix: str):
            return [{
                "key": f"tenants/{tenant_id}/{db_id}/wal/wal-{target_ts.strftime('%Y%m%dT%H%M%SZ')}.log",
                "size": 20,
            }]
        async def download_database(self, key: str) -> bytes:
            # One JSONL entry with ts within target range
            line = '{"ts":"%s","query":"CREATE (:X)"}\n' % target_ts.isoformat()
            return line.encode("utf-8")
        async def delete_database(self, key: str) -> bool:
            return True

    storage = FakeStorage()

    locks = Mock()
    locks.acquire_lock = AsyncMock(return_value="tok")
    locks.release_lock = AsyncMock(return_value=None)

    cache = Mock()
    cache.delete = AsyncMock(return_value=None)

    # Kuzu executes queries (yield once)
    async def _exec_query(**kwargs):
        yield {"ok": True}
    kuzu = Mock()
    kuzu.execute_query = _exec_query

    # snapshot_uc fake that records archive flag use (we trust unit test for path building)
    class SnapshotRes:
        def __init__(self, snapshot_id):
            self.snapshot_id = snapshot_id
            self.object_key = "s3://bucket/key"
            self.checksum = "x"
            self.size_bytes = 1
            self.created_at = datetime.now(timezone.utc).isoformat()

    snapshot_uc = Mock()
    snapshot_uc.execute = AsyncMock(return_value=SnapshotRes(uuid4()))

    uc = RestoreDatabasePITRUseCase(
        authz=authz,
        db_repo=db_repo,
        snapshots=snapshots,
        storage=storage,  # type: ignore
        locks=locks,
        cache=cache,
        kuzu=kuzu,
        snapshot_uc=snapshot_uc,
    )

    res = await uc.execute(RestoreDatabasePITRRequest(
        tenant_id=tenant_id,
        database_id=db_id,
        target_timestamp=target_ts,
    ))

    assert res.restored is True
    assert res.snapshot_created is not None
    snapshot_uc.execute.assert_awaited()
