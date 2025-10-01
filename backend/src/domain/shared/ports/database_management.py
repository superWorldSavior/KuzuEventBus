"""
Database Management domain ports.

Repository and service protocols for Kuzu database operations.
"""
from typing import (
    Any,
    AsyncGenerator,
    Dict,
    List,
    Optional,
    Protocol,
    runtime_checkable,
)
from uuid import UUID


@runtime_checkable
class KuzuDatabaseRepository(Protocol):
    """Protocol for Kuzu database metadata persistence."""

    async def save_database_metadata(
        self,
        tenant_id: UUID,
        database_name: str,
        file_path: str,
        size_bytes: int,
        metadata: Dict[str, Any],
    ) -> UUID:
        """Save database metadata and return database ID."""
        ...

    async def find_by_id(self, database_id: UUID) -> Optional[Dict[str, Any]]:
        """Find database metadata by ID."""
        ...

    async def find_by_tenant(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """Find all databases for a tenant."""
        ...

    async def delete(self, database_id: UUID) -> bool:
        """Delete database metadata."""
        ...


@runtime_checkable
class FileStorageService(Protocol):
    """Protocol for file storage operations (MinIO)."""

    async def upload_database(
        self, tenant_id: UUID, database_id: UUID, file_content: bytes, filename: str
    ) -> str:
        """Upload database file and return storage path."""
        ...

    async def download_database(self, file_path: str) -> bytes:
        """Download database file content."""
        ...

    async def delete_database(self, file_path: str) -> bool:
        """Delete database file."""
        ...

    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists in storage."""
        ...

    async def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes."""
        ...

    async def list_objects(self, prefix: str) -> List[Dict[str, Any]]:
        """List objects in storage with given prefix.
        
        Returns list of dicts with keys: 'key', 'size', 'last_modified'
        """
        ...


@runtime_checkable
class KuzuQueryService(Protocol):
    """Protocol for Kuzu database query operations."""

    async def validate_query(self, query: str) -> bool:
        """Validate Cypher query syntax."""
        ...

    async def execute_query(
        self,
        database_path: str,
        query: str,
        parameters: Dict[str, Any] = None,
        timeout_seconds: int = 300,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute query and stream results."""
        ...

    async def get_database_schema(self, database_path: str) -> Dict[str, Any]:
        """Get database schema information."""
        ...

    async def get_database_stats(self, database_path: str) -> Dict[str, Any]:
        """Get database statistics."""
        ...

    async def create_empty_database(self, database_path: str) -> bool:
        """Create new empty Kuzu database."""
        ...


# Provisioning ports (migrated from domain/database_management/provisioning.py)

@runtime_checkable
class BucketProvisioningService(Protocol):
    """Port for ensuring a tenant-specific bucket exists."""

    async def ensure_bucket(self, tenant_id: UUID) -> str:
        """Ensure bucket for tenant exists, returning bucket name.

        Should be idempotent but fail fast on irrecoverable errors.
        """
        ...


@runtime_checkable
class DatabaseProvisioningService(Protocol):
    """Port for creating a concrete Kuzu database directory for a tenant."""

    async def create_database(self, tenant_id: UUID, name: Any) -> Any:
        """Create a new database (fails if already exists for that name)."""
        ...


@runtime_checkable
class DatabaseMetadataRepository(Protocol):
    """Port for persisting and querying database metadata records."""

    async def save(self, meta: Any) -> UUID:  # returns meta.id
        ...

    async def find_by_tenant(self, tenant_id: UUID) -> List[Any]:
        ...

    async def find_by_name(self, tenant_id: UUID, name: str) -> Optional[Any]:
        ...


@runtime_checkable
class SnapshotRepository(Protocol):
    """Port for persisting and querying database snapshot metadata records."""

    async def save(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        object_key: str,
        checksum: str,
        size_bytes: int,
        created_at: str,
    ) -> UUID:
        ...

    async def list_by_database(self, database_id: UUID) -> List[Dict[str, Any]]:
        """List all snapshots for a database (no tenant_id needed)."""
        ...

    async def find_by_id(self, snapshot_id: UUID) -> Optional[Dict[str, Any]]:
        ...

    async def delete(self, snapshot_id: UUID) -> bool:
        ...
