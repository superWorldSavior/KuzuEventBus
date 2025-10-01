"""Unit tests for MinioFileStorageService.list_objects."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from src.infrastructure.file_storage.minio_service import MinioFileStorageService


@pytest.fixture
def mock_minio_client():
    """Mock MinIO client."""
    client = MagicMock()
    client.bucket_exists = MagicMock(return_value=True)
    return client


@pytest.fixture
def minio_service(mock_minio_client):
    """MinIO service with mocked client."""
    with patch('src.infrastructure.file_storage.minio_service.Minio', return_value=mock_minio_client):
        with patch.dict('os.environ', {
            'MINIO_ENDPOINT': 'localhost:9000',
            'MINIO_ACCESS_KEY': 'minioadmin',
            'MINIO_SECRET_KEY': 'minioadmin123',
            'MINIO_BUCKET': 'test-bucket',
        }):
            service = MinioFileStorageService()
            service._client = mock_minio_client
            return service


class TestListObjects:
    """Tests for MinioFileStorageService.list_objects method."""

    @pytest.mark.asyncio
    async def test_list_objects_empty_prefix(self, minio_service, mock_minio_client):
        """Should list all objects when prefix is empty."""
        mock_obj = MagicMock()
        mock_obj.object_name = "file1.txt"
        mock_obj.size = 1024
        mock_obj.last_modified = datetime(2025, 1, 1, 12, 0, 0)
        
        mock_minio_client.list_objects.return_value = [mock_obj]
        
        result = await minio_service.list_objects("")
        
        assert len(result) == 1
        assert result[0]["key"] == "file1.txt"
        assert result[0]["size"] == 1024
        assert result[0]["last_modified"] is not None

    @pytest.mark.asyncio
    async def test_list_objects_with_prefix(self, minio_service, mock_minio_client):
        """Should list objects matching prefix."""
        mock_obj1 = MagicMock()
        mock_obj1.object_name = "tenants/123/databases/db1/file1.kuzu"
        mock_obj1.size = 2048
        mock_obj1.last_modified = datetime(2025, 1, 1, 12, 0, 0)
        
        mock_obj2 = MagicMock()
        mock_obj2.object_name = "tenants/123/databases/db1/wal/wal-001.log"
        mock_obj2.size = 512
        mock_obj2.last_modified = datetime(2025, 1, 1, 13, 0, 0)
        
        mock_minio_client.list_objects.return_value = [mock_obj1, mock_obj2]
        
        result = await minio_service.list_objects("tenants/123/databases/db1/")
        
        assert len(result) == 2
        assert result[0]["key"] == "tenants/123/databases/db1/file1.kuzu"
        assert result[1]["key"] == "tenants/123/databases/db1/wal/wal-001.log"

    @pytest.mark.asyncio
    async def test_list_objects_wal_prefix(self, minio_service, mock_minio_client):
        """Should list WAL files with wal/ prefix."""
        wal_files = []
        for i in range(3):
            mock_obj = MagicMock()
            mock_obj.object_name = f"tenants/123/db-456/wal/wal-{i:03d}.log"
            mock_obj.size = 1024 * (i + 1)
            mock_obj.last_modified = datetime(2025, 1, 1, 12 + i, 0, 0)
            wal_files.append(mock_obj)
        
        mock_minio_client.list_objects.return_value = wal_files
        
        result = await minio_service.list_objects("tenants/123/db-456/wal/")
        
        assert len(result) == 3
        for i, obj in enumerate(result):
            assert obj["key"] == f"tenants/123/db-456/wal/wal-{i:03d}.log"
            assert obj["size"] == 1024 * (i + 1)

    @pytest.mark.asyncio
    async def test_list_objects_no_results(self, minio_service, mock_minio_client):
        """Should return empty list when no objects match."""
        mock_minio_client.list_objects.return_value = []
        
        result = await minio_service.list_objects("nonexistent/prefix/")
        
        assert result == []

    @pytest.mark.asyncio
    async def test_list_objects_handles_s3_error(self, minio_service, mock_minio_client):
        """Should handle S3 errors gracefully and return empty list."""
        from minio.error import S3Error
        
        mock_minio_client.list_objects.side_effect = S3Error(
            code="NoSuchBucket",
            message="Bucket does not exist",
            resource="test-bucket",
            request_id="123",
            host_id="host-123",
            response=MagicMock(status=404),
        )
        
        result = await minio_service.list_objects("any/prefix/")
        
        # Should return empty list on error (as per implementation)
        assert result == []

    @pytest.mark.asyncio
    async def test_list_objects_calls_minio_correctly(self, minio_service, mock_minio_client):
        """Should call MinIO list_objects with correct parameters."""
        mock_minio_client.list_objects.return_value = []
        
        await minio_service.list_objects("test/prefix/")
        
        mock_minio_client.list_objects.assert_called_once_with(
            "test-bucket",
            prefix="test/prefix/",
            recursive=True,
        )

    @pytest.mark.asyncio
    async def test_list_objects_with_none_last_modified(self, minio_service, mock_minio_client):
        """Should handle objects with None last_modified."""
        mock_obj = MagicMock()
        mock_obj.object_name = "file.txt"
        mock_obj.size = 1024
        mock_obj.last_modified = None
        
        mock_minio_client.list_objects.return_value = [mock_obj]
        
        result = await minio_service.list_objects("prefix/")
        
        assert len(result) == 1
        assert result[0]["last_modified"] is None

    @pytest.mark.asyncio
    async def test_list_objects_large_result_set(self, minio_service, mock_minio_client):
        """Should handle large numbers of objects."""
        objects = []
        for i in range(1000):
            mock_obj = MagicMock()
            mock_obj.object_name = f"file-{i:04d}.txt"
            mock_obj.size = i * 100
            mock_obj.last_modified = datetime(2025, 1, 1, 12, 0, 0)
            objects.append(mock_obj)
        
        mock_minio_client.list_objects.return_value = objects
        
        result = await minio_service.list_objects("large/")
        
        assert len(result) == 1000
        assert result[0]["key"] == "file-0000.txt"
        assert result[999]["key"] == "file-0999.txt"

    @pytest.mark.asyncio
    async def test_list_objects_preserves_metadata(self, minio_service, mock_minio_client):
        """Should preserve all object metadata in response."""
        test_time = datetime(2025, 1, 15, 14, 30, 45)
        mock_obj = MagicMock()
        mock_obj.object_name = "path/to/file.dat"
        mock_obj.size = 4096
        mock_obj.last_modified = test_time
        
        mock_minio_client.list_objects.return_value = [mock_obj]
        
        result = await minio_service.list_objects("path/")
        
        assert result[0]["key"] == "path/to/file.dat"
        assert result[0]["size"] == 4096
        assert result[0]["last_modified"] == test_time.isoformat()

    @pytest.mark.asyncio
    async def test_list_objects_recursive_true(self, minio_service, mock_minio_client):
        """Should use recursive=True to get all nested objects."""
        nested_objects = [
            ("dir1/file1.txt", 100),
            ("dir1/subdir/file2.txt", 200),
            ("dir1/subdir/deep/file3.txt", 300),
        ]
        
        mock_objects = []
        for path, size in nested_objects:
            mock_obj = MagicMock()
            mock_obj.object_name = path
            mock_obj.size = size
            mock_obj.last_modified = datetime(2025, 1, 1, 12, 0, 0)
            mock_objects.append(mock_obj)
        
        mock_minio_client.list_objects.return_value = mock_objects
        
        result = await minio_service.list_objects("dir1/")
        
        assert len(result) == 3
        # Verify all nested levels are included
        assert any(obj["key"] == "dir1/subdir/deep/file3.txt" for obj in result)
