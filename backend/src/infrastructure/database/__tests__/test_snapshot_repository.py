"""Unit tests for SnapshotRepository.list_by_database."""
import pytest
from uuid import uuid4
from datetime import datetime
from unittest.mock import MagicMock, patch

from src.infrastructure.database.snapshot_repository import PostgresSnapshotRepository


@pytest.fixture
def mock_session():
    """Mock database session."""
    session = MagicMock()
    return session


@pytest.fixture
def snapshot_repo():
    """Snapshot repository with mocked session."""
    with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
        mock_session = MagicMock()
        mock_factory.return_value.__enter__ = MagicMock(return_value=mock_session)
        mock_factory.return_value.__exit__ = MagicMock(return_value=False)
        
        repo = PostgresSnapshotRepository()
        repo._session = mock_session
        return repo


class TestSnapshotRepositoryListByDatabase:
    """Tests for list_by_database method."""

    @pytest.mark.asyncio
    async def test_list_by_database_with_tenant_id(self, snapshot_repo):
        """Should filter by both tenant_id and database_id when tenant_id provided."""
        tenant_id = uuid4()
        database_id = uuid4()
        
        with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
            mock_session = MagicMock()
            mock_result = MagicMock()
            
            # Mock query result
            mock_rows = [
                (
                    "snap-1",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/snap1.tar.gz",
                    "checksum123",
                    1024000,
                    datetime(2025, 1, 1, 12, 0, 0),
                ),
                (
                    "snap-2",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/snap2.tar.gz",
                    "checksum456",
                    2048000,
                    datetime(2025, 1, 1, 14, 0, 0),
                ),
            ]
            
            mock_result.fetchall.return_value = mock_rows
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__enter__.return_value = mock_session
            mock_factory.return_value.__exit__.return_value = False
            
            repo = PostgresSnapshotRepository()
            result = await repo.list_by_database(database_id, tenant_id)
            
            assert len(result) == 2
            assert result[0]["id"] == "snap-1"
            assert result[0]["tenant_id"] == str(tenant_id)
            assert result[1]["id"] == "snap-2"

    @pytest.mark.asyncio
    async def test_list_by_database_without_tenant_id(self, snapshot_repo):
        """Should filter only by database_id when tenant_id is None."""
        database_id = uuid4()
        
        with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
            mock_session = MagicMock()
            mock_result = MagicMock()
            
            # Multiple tenants for same database
            mock_rows = [
                (
                    "snap-1",
                    str(uuid4()),  # tenant A
                    str(database_id),
                    "s3://bucket/snap1.tar.gz",
                    "checksum123",
                    1024000,
                    datetime(2025, 1, 1, 12, 0, 0),
                ),
                (
                    "snap-2",
                    str(uuid4()),  # tenant B
                    str(database_id),
                    "s3://bucket/snap2.tar.gz",
                    "checksum456",
                    2048000,
                    datetime(2025, 1, 1, 14, 0, 0),
                ),
            ]
            
            mock_result.fetchall.return_value = mock_rows
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__enter__.return_value = mock_session
            mock_factory.return_value.__exit__.return_value = False
            
            repo = PostgresSnapshotRepository()
            result = await repo.list_by_database(database_id, tenant_id=None)
            
            # Should return snapshots from all tenants
            assert len(result) == 2

    @pytest.mark.asyncio
    async def test_list_by_database_empty_result(self):
        """Should return empty list when no snapshots found."""
        database_id = uuid4()
        
        with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
            mock_session = MagicMock()
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__enter__.return_value = mock_session
            mock_factory.return_value.__exit__.return_value = False
            
            repo = PostgresSnapshotRepository()
            result = await repo.list_by_database(database_id)
            
            assert result == []

    @pytest.mark.asyncio
    async def test_list_by_database_ordered_by_created_at_desc(self):
        """Should return snapshots ordered by created_at DESC (newest first)."""
        database_id = uuid4()
        tenant_id = uuid4()
        
        with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
            mock_session = MagicMock()
            mock_result = MagicMock()
            
            # Rows should be in DESC order
            mock_rows = [
                (
                    "snap-new",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/snap-new.tar.gz",
                    "checksum3",
                    3000000,
                    datetime(2025, 1, 3, 12, 0, 0),  # Newest
                ),
                (
                    "snap-mid",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/snap-mid.tar.gz",
                    "checksum2",
                    2000000,
                    datetime(2025, 1, 2, 12, 0, 0),
                ),
                (
                    "snap-old",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/snap-old.tar.gz",
                    "checksum1",
                    1000000,
                    datetime(2025, 1, 1, 12, 0, 0),  # Oldest
                ),
            ]
            
            mock_result.fetchall.return_value = mock_rows
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__enter__.return_value = mock_session
            mock_factory.return_value.__exit__.return_value = False
            
            repo = PostgresSnapshotRepository()
            result = await repo.list_by_database(database_id, tenant_id)
            
            assert len(result) == 3
            # Verify order: newest first
            assert result[0]["id"] == "snap-new"
            assert result[1]["id"] == "snap-mid"
            assert result[2]["id"] == "snap-old"

    @pytest.mark.asyncio
    async def test_list_by_database_formats_datetime_correctly(self):
        """Should format datetime fields to ISO format strings."""
        database_id = uuid4()
        tenant_id = uuid4()
        
        with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
            mock_session = MagicMock()
            mock_result = MagicMock()
            
            test_datetime = datetime(2025, 1, 15, 14, 30, 45)
            mock_rows = [
                (
                    "snap-1",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/snap.tar.gz",
                    "checksum",
                    1024,
                    test_datetime,
                ),
            ]
            
            mock_result.fetchall.return_value = mock_rows
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__enter__.return_value = mock_session
            mock_factory.return_value.__exit__.return_value = False
            
            repo = PostgresSnapshotRepository()
            result = await repo.list_by_database(database_id, tenant_id)
            
            assert result[0]["created_at"] == test_datetime.isoformat()

    @pytest.mark.asyncio
    async def test_list_by_database_returns_all_fields(self):
        """Should return all expected fields in response."""
        database_id = uuid4()
        tenant_id = uuid4()
        
        with patch('src.infrastructure.database.snapshot_repository.SessionFactory') as mock_factory:
            mock_session = MagicMock()
            mock_result = MagicMock()
            
            mock_rows = [
                (
                    "snap-abc-123",
                    str(tenant_id),
                    str(database_id),
                    "s3://bucket/tenants/123/db-456/snapshot.tar.gz",
                    "abc123def456",
                    9876543210,
                    datetime(2025, 1, 1, 12, 0, 0),
                ),
            ]
            
            mock_result.fetchall.return_value = mock_rows
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__enter__.return_value = mock_session
            mock_factory.return_value.__exit__.return_value = False
            
            repo = PostgresSnapshotRepository()
            result = await repo.list_by_database(database_id, tenant_id)
            
            snapshot = result[0]
            assert "id" in snapshot
            assert "tenant_id" in snapshot
            assert "database_id" in snapshot
            assert "object_key" in snapshot
            assert "checksum" in snapshot
            assert "size_bytes" in snapshot
            assert "created_at" in snapshot
            
            assert snapshot["id"] == "snap-abc-123"
            assert snapshot["object_key"] == "s3://bucket/tenants/123/db-456/snapshot.tar.gz"
            assert snapshot["checksum"] == "abc123def456"
            assert snapshot["size_bytes"] == 9876543210
