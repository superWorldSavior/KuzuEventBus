import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, Mock
from dataclasses import dataclass

from src.application.usecases.create_database_snapshot import (
    CreateDatabaseSnapshotUseCase,
    CreateDatabaseSnapshotRequest,
)


@dataclass
class DummyCfg:
    class Retention:
        snapshots_archive_days: int = 90
        wal_days: int = 90
    retention: Retention = Retention()


@pytest.mark.asyncio
async def test_create_snapshot_archive_uses_archive_prefix_and_tags(monkeypatch, tmp_path):
    tenant_id = uuid4()
    database_id = uuid4()

    # Create fake kuzu file
    fake_db_path = tmp_path / "data.kuzu"
    fake_db_path.write_text("fake kuzu data")

    # Mocks
    authz = Mock()
    authz.check_permission = AsyncMock(return_value=True)

    db_repo = Mock()
    db_repo.find_by_id = AsyncMock(return_value={
        "tenant_id": str(tenant_id),
        "file_path": str(fake_db_path),
    })

    # Fake storage to capture filename and tags
    class FakeStorage:
        def __init__(self):
            self.filename = None
            self.tags = None
            self.object_key = None
        async def upload_database(self, tenant_id, database_id, file_content, filename):
            self.filename = filename
            self.object_key = f"s3://bucket/tenants/{tenant_id}/{database_id}/{filename}"
            return self.object_key
        async def set_object_tags(self, file_path, tags):
            self.tags = tags
            return True

    storage = FakeStorage()

    snapshots = Mock()
    snapshots.save = AsyncMock(return_value=uuid4())

    locks = Mock()
    locks.acquire_lock = AsyncMock(return_value="token")
    locks.release_lock = AsyncMock(return_value=None)

    cache = Mock()
    cache.delete = AsyncMock(return_value=None)

    # settings() returns our dummy config
    monkeypatch.setattr("src.application.usecases.create_database_snapshot.settings", lambda: DummyCfg())

    uc = CreateDatabaseSnapshotUseCase(
        authz=authz,
        db_repo=db_repo,
        storage=storage,
        snapshots=snapshots,
        locks=locks,
        cache=cache,
    )

    # Execute with archive=True
    req = CreateDatabaseSnapshotRequest(tenant_id=tenant_id, database_id=database_id, archive=True)
    res = await uc.execute(req)

    # Assert archive prefix used
    assert storage.filename is not None
    assert storage.filename.startswith("snapshots/archive/")

    # Assert tagging applied
    assert storage.tags is not None
    assert storage.tags.get("category") == "snapshot-archive"
    assert storage.tags.get("retention_days") == str(DummyCfg.Retention.snapshots_archive_days)

    # Snapshot saved in repo
    snapshots.save.assert_awaited()
    assert res.snapshot_id is not None
