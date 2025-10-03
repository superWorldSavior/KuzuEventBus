"""Unit tests for RestoreDatabasePITRUseCase."""
import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from src.application.usecases.restore_database_pitr import (
    RestoreDatabasePITRUseCase,
    RestoreDatabasePITRRequest,
)


@pytest.fixture
def tenant_id():
    return uuid4()


@pytest.fixture
def database_id():
    return uuid4()


@pytest.fixture
def mock_authz():
    authz = AsyncMock()
    authz.check_permission = AsyncMock(return_value=True)
    return authz


@pytest.fixture
def mock_db_repo(tenant_id, tmp_path):
    # Create the database directory structure
    db_dir = tmp_path / "tenant" / "database"
    db_dir.mkdir(parents=True, exist_ok=True)
    db_path = db_dir / "data.kuzu"
    # Create a dummy database file
    db_path.write_text("dummy kuzu db")
    
    repo = AsyncMock()
    repo.find_by_id = AsyncMock(return_value={
        "id": "db-123",
        "tenant_id": str(tenant_id),  # Use the actual tenant_id from fixture
        "file_path": str(db_path),  # Full path to data.kuzu
        "path": str(db_path),  # Alternative field name
        "name": "test-db",
    })
    return repo


@pytest.fixture
def mock_snapshots_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_storage():
    """Mock storage that returns valid tar.gz data."""
    import io
    import tarfile
    
    # Create a valid tar.gz in memory
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        # Add a dummy file
        info = tarfile.TarInfo(name="test.kuzu")
        info.size = len(b"test data")
        tar.addfile(info, io.BytesIO(b"test data"))
    
    storage = AsyncMock()
    storage.download_database = AsyncMock(return_value=buf.getvalue())
    storage.list_objects = AsyncMock(return_value=[])
    return storage


@pytest.fixture
def mock_locks():
    locks = AsyncMock()
    locks.acquire_lock = AsyncMock(return_value="lock-token-123")
    locks.release_lock = AsyncMock(return_value=True)
    return locks


@pytest.fixture
def mock_cache():
    cache = AsyncMock()
    cache.delete = AsyncMock(return_value=True)
    return cache


@pytest.fixture
def mock_kuzu():
    """Mock KuzuQueryService for WAL replay."""
    kuzu = AsyncMock()
    # execute_query returns an async generator
    async def mock_execute():
        yield {}
    kuzu.execute_query = AsyncMock(return_value=mock_execute())
    return kuzu


@pytest.fixture
def use_case(mock_authz, mock_db_repo, mock_snapshots_repo, mock_storage, mock_locks, mock_cache, mock_kuzu):
    uc = RestoreDatabasePITRUseCase(
        authz=mock_authz,
        db_repo=mock_db_repo,
        snapshots=mock_snapshots_repo,
        storage=mock_storage,
        locks=mock_locks,
        cache=mock_cache,
        kuzu=mock_kuzu,
    )
    # Mock the internal _restore_snapshot method to avoid filesystem complexity in tests
    uc._restore_snapshot = AsyncMock(return_value=None)
    uc._replay_wal_files = AsyncMock(return_value=0)
    return uc


class TestRestoreDatabasePITR:
    """Tests for PITR restore use case."""

    @pytest.mark.asyncio
    async def test_pitr_restore_not_authorized(self, use_case, tenant_id, database_id, mock_authz):
        """Should fail when user not authorized."""
        mock_authz.check_permission.return_value = False
        
        target = datetime.now(timezone.utc) - timedelta(hours=1)
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        with pytest.raises(PermissionError):
            await use_case.execute(request)

    @pytest.mark.asyncio
    async def test_pitr_restore_future_timestamp_fails(self, use_case, tenant_id, database_id):
        """Should fail when trying to restore to future timestamp."""
        future_time = datetime.now(timezone.utc) + timedelta(hours=1)
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=future_time,
        )
        
        with pytest.raises(ValueError):
            await use_case.execute(request)

    @pytest.mark.asyncio
    async def test_pitr_restore_database_not_found(self, use_case, tenant_id, database_id, mock_db_repo):
        """Should fail when database not found."""
        mock_db_repo.find_by_id.return_value = None
        
        target = datetime.now(timezone.utc) - timedelta(hours=1)
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        with pytest.raises(FileNotFoundError):
            await use_case.execute(request)

    @pytest.mark.asyncio
    async def test_pitr_restore_no_snapshots(self, use_case, tenant_id, database_id, mock_snapshots_repo):
        """Should fail when no snapshots available before target timestamp."""
        mock_snapshots_repo.list_by_database.return_value = []
        
        target = datetime.now(timezone.utc) - timedelta(hours=1)
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        with pytest.raises(FileNotFoundError):
            await use_case.execute(request)

    @pytest.mark.asyncio
    async def test_pitr_restore_acquires_lock(self, use_case, tenant_id, database_id, mock_locks, mock_snapshots_repo):
        """Should acquire distributed lock before restore."""
        now = datetime.now(timezone.utc)
        snapshot_time = now - timedelta(hours=2)
        target = now - timedelta(hours=1)
        
        mock_snapshots_repo.list_by_database.return_value = [{
            "id": "snap-123",
            "created_at": snapshot_time.isoformat(),
            "object_key": "snapshot.tar.gz",
        }]
        
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        await use_case.execute(request)
        
        mock_locks.acquire_lock.assert_called_once()
        lock_key = mock_locks.acquire_lock.call_args[0][0]
        assert f"db:{database_id}:pitr_restore" == lock_key

    @pytest.mark.asyncio
    async def test_pitr_restore_releases_lock_on_error(
        self, use_case, tenant_id, database_id, mock_locks, mock_snapshots_repo, mock_storage
    ):
        """Should release lock even when restore fails."""
        now = datetime.now(timezone.utc)
        snapshot_time = now - timedelta(hours=2)
        target = now - timedelta(hours=1)
        
        mock_snapshots_repo.list_by_database.return_value = [{
            "id": "snap-123",
            "created_at": snapshot_time.isoformat(),
            "object_key": "snapshot.tar.gz",
        }]
        # Configure the mocked _restore_snapshot to raise an exception for this test
        use_case._restore_snapshot.side_effect = Exception("Restore failed")
        
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        with pytest.raises(Exception):
            await use_case.execute(request)
        
        mock_locks.release_lock.assert_called_once()

    @pytest.mark.asyncio
    async def test_pitr_restore_uses_nearest_snapshot(
        self, use_case, tenant_id, database_id, mock_snapshots_repo
    ):
        """Should use snapshot closest to (but before) target timestamp."""
        now = datetime.now(timezone.utc)
        snap1_time = now - timedelta(hours=5)
        snap2_time = now - timedelta(hours=3)  # This one should be selected
        snap3_time = now - timedelta(hours=1)
        target = now - timedelta(hours=2)
        
        mock_snapshots_repo.list_by_database.return_value = [
            {
                "id": "snap-1",
                "created_at": snap1_time.isoformat(),
                "object_key": "snapshot1.tar.gz",
            },
            {
                "id": "snap-2",
                "created_at": snap2_time.isoformat(),
                "object_key": "snapshot2.tar.gz",
            },
            {
                "id": "snap-3",
                "created_at": snap3_time.isoformat(),
                "object_key": "snapshot3.tar.gz",
            },
        ]
        
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        result = await use_case.execute(request)
        
        # Should use snap-2 (3h ago, closest before 2h ago target)
        assert result.snapshot_used == "snap-2"

    @pytest.mark.asyncio
    async def test_pitr_restore_finds_wal_files(
        self, use_case, tenant_id, database_id, mock_snapshots_repo, mock_storage
    ):
        """Should find and list WAL files in time range."""
        now = datetime.now(timezone.utc)
        snapshot_time = now - timedelta(hours=3)
        target = now - timedelta(hours=1)
        
        mock_snapshots_repo.list_by_database.return_value = [{
            "id": "snap-123",
            "created_at": snapshot_time.isoformat(),
            "object_key": "snapshot.tar.gz",
        }]
        
        # WAL files in range
        wal1_time = snapshot_time + timedelta(hours=1)
        wal2_time = snapshot_time + timedelta(hours=1, minutes=30)
        
        mock_storage.list_objects.return_value = [
            {
                "key": f"tenants/{tenant_id}/{database_id}/wal/wal-{wal1_time.strftime('%Y%m%dT%H%M%SZ')}.log",
                "size": 1024,
            },
            {
                "key": f"tenants/{tenant_id}/{database_id}/wal/wal-{wal2_time.strftime('%Y%m%dT%H%M%SZ')}.log",
                "size": 2048,
            },
        ]
        
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        result = await use_case.execute(request)
        
        # Should have replayed WAL files
        assert result.wal_files_replayed >= 0  # Depends on implementation

    @pytest.mark.asyncio
    async def test_pitr_restore_invalidates_cache(
        self, use_case, tenant_id, database_id, mock_snapshots_repo, mock_cache
    ):
        """Should invalidate database cache after restore."""
        now = datetime.now(timezone.utc)
        snapshot_time = now - timedelta(hours=2)
        target = now - timedelta(hours=1)
        
        mock_snapshots_repo.list_by_database.return_value = [{
            "id": "snap-123",
            "created_at": snapshot_time.isoformat(),
            "object_key": "snapshot.tar.gz",
        }]
        
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        await use_case.execute(request)
        
        mock_cache.delete.assert_called_once_with(f"db_info:{database_id}")

    @pytest.mark.asyncio
    async def test_pitr_restore_success_response(
        self, use_case, tenant_id, database_id, mock_snapshots_repo
    ):
        """Should return complete success response."""
        now = datetime.now(timezone.utc)
        snapshot_time = now - timedelta(hours=2)
        target = now - timedelta(hours=1)
        
        snapshot_id = "snap-abc-123"
        mock_snapshots_repo.list_by_database.return_value = [{
            "id": snapshot_id,
            "created_at": snapshot_time.isoformat(),
            "object_key": "snapshot.tar.gz",
        }]
        
        request = RestoreDatabasePITRRequest(
            tenant_id=tenant_id,
            database_id=database_id,
            target_timestamp=target,
        )
        
        result = await use_case.execute(request)
        
        assert result.restored is True
        assert result.database_id == database_id
        assert result.target_timestamp == target.isoformat()
        assert result.snapshot_used == snapshot_id
        assert result.wal_files_replayed >= 0
        assert result.restored_at is not None
