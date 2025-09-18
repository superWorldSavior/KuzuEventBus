"""
Database Management Application Service.

Handles Kuzu database creation, management, and file operations.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from ...domain.shared.ports import (
    AuthorizationService,
    CacheService,
    CustomerAccountRepository,
    FileStorageService,
    KuzuDatabaseRepository,
    KuzuQueryService,
    NotificationService,
)
from ...domain.shared.value_objects import EntityId


class DatabaseManagementService:
    """Application service for database management operations."""

    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        database_repository: KuzuDatabaseRepository,
        file_storage: FileStorageService,
        query_service: KuzuQueryService,
        auth_service: AuthorizationService,
        notification_service: NotificationService,
        cache_service: CacheService,
    ) -> None:
        self._account_repository = account_repository
        self._database_repository = database_repository
        self._file_storage = file_storage
        self._query_service = query_service
        self._auth_service = auth_service
        self._notification_service = notification_service
        self._cache_service = cache_service

    async def create_database(
        self, tenant_id: UUID, database_name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new Kuzu database for tenant.

        Args:
            tenant_id: Customer tenant ID
            database_name: Unique database name
            description: Optional database description

        Returns:
            Dict with database details

        Raises:
            ValueError: If validation fails or database already exists
            PermissionError: If tenant lacks permissions
        """
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="database", action="create"
        )
        if not allowed:
            raise PermissionError("Not authorized to create databases")

        # Check quota
        quota_check = await self._auth_service.check_quota(
            tenant_id=tenant_id, resource_type="databases", requested_amount=1
        )
        if not quota_check["allowed"]:
            raise ValueError(
                f"Database quota exceeded. "
                f"Used: {quota_check['used']}/{quota_check['limit']}"
            )

        # Verify tenant exists and is active
        account = await self._account_repository.find_by_id(EntityId(tenant_id))
        if not account or not account.is_active():
            raise ValueError("Invalid or inactive tenant")

        # Check if database name already exists for tenant
        existing = await self._database_repository.find_by_name(
            tenant_id, database_name
        )
        if existing:
            raise ValueError(f"Database '{database_name}' already exists")

        # Create database
        database_id = uuid4()
        success = await self._database_repository.create_database(
            database_id=database_id,
            tenant_id=tenant_id,
            name=database_name,
            description=description,
        )

        if not success:
            raise RuntimeError("Failed to create database")

        # Get database details
        db_info = await self._database_repository.get_database_info(database_id)

        # Send notification
        await self._notification_service.send_notification(
            tenant_id=tenant_id,
            notification_type="database_created",
            title="Database Created",
            message=f"Database '{database_name}' has been created successfully",
            metadata={"database_id": str(database_id)},
        )

        # Cache database info
        cache_key = f"db_info:{database_id}"
        await self._cache_service.set(
            key=cache_key, value=db_info, expire_seconds=1800  # 30 minutes
        )

        return {
            "database_id": str(database_id),
            "name": database_name,
            "description": description,
            "created_at": db_info.get("created_at"),
            "size_bytes": db_info.get("size_bytes", 0),
            "table_count": db_info.get("table_count", 0),
        }

    async def list_databases(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """List all databases for tenant."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="database", action="list"
        )
        if not allowed:
            raise PermissionError("Not authorized to list databases")

        databases = await self._database_repository.list_databases(tenant_id)

        # Enrich with cached metadata
        enriched_databases = []
        for db in databases:
            cache_key = f"db_info:{db['database_id']}"
            cached_info = await self._cache_service.get(cache_key)

            if cached_info:
                db.update(cached_info)

            enriched_databases.append(db)

        return enriched_databases

    async def get_database_info(
        self, tenant_id: UUID, database_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get detailed database information."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="database", action="read"
        )
        if not allowed:
            raise PermissionError("Not authorized to read database")

        # Try cache first
        cache_key = f"db_info:{database_id}"
        cached = await self._cache_service.get(cache_key)
        if cached:
            return cached

        # Fetch from repository
        db_info = await self._database_repository.get_database_info(database_id)
        if not db_info:
            return None

        # Verify ownership
        if db_info.get("tenant_id") != str(tenant_id):
            raise PermissionError("Database does not belong to tenant")

        # Get schema information
        schema = await self._query_service.get_schema(database_id)
        db_info["schema"] = schema

        # Cache the result
        await self._cache_service.set(key=cache_key, value=db_info, expire_seconds=1800)

        return db_info

    async def delete_database(self, tenant_id: UUID, database_id: UUID) -> bool:
        """Delete a database and all its data."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="database", action="delete"
        )
        if not allowed:
            raise PermissionError("Not authorized to delete databases")

        # Verify ownership
        db_info = await self._database_repository.get_database_info(database_id)
        if not db_info or db_info.get("tenant_id") != str(tenant_id):
            return False

        # Delete database files from storage
        file_path = f"databases/{tenant_id}/{database_id}/"
        await self._file_storage.delete_file(file_path)

        # Delete database metadata
        success = await self._database_repository.delete_database(database_id)

        if success:
            # Clear cache
            cache_key = f"db_info:{database_id}"
            await self._cache_service.delete(cache_key)

            # Send notification
            await self._notification_service.send_notification(
                tenant_id=tenant_id,
                notification_type="database_deleted",
                title="Database Deleted",
                message=f"Database '{db_info.get('name')}' has been deleted",
                metadata={"database_id": str(database_id)},
            )

        return success

    async def upload_database_file(
        self, tenant_id: UUID, database_id: UUID, file_content: bytes, file_name: str
    ) -> Dict[str, Any]:
        """Upload database file to storage."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="database", action="write"
        )
        if not allowed:
            raise PermissionError("Not authorized to upload files")

        # Check storage quota
        file_size = len(file_content)
        quota_check = await self._auth_service.check_quota(
            tenant_id=tenant_id, resource_type="storage", requested_amount=file_size
        )
        if not quota_check["allowed"]:
            raise ValueError(
                f"Storage quota exceeded. "
                f"Used: {quota_check['used']}/{quota_check['limit']} bytes"
            )

        # Verify database ownership
        db_info = await self._database_repository.get_database_info(database_id)
        if not db_info or db_info.get("tenant_id") != str(tenant_id):
            raise PermissionError("Database does not belong to tenant")

        # Upload file
        file_path = f"databases/{tenant_id}/{database_id}/{file_name}"
        upload_result = await self._file_storage.upload_file(
            file_path=file_path,
            content=file_content,
            content_type="application/octet-stream",
        )

        # Update database size
        await self._database_repository.update_size(database_id, file_size)

        # Clear cache
        cache_key = f"db_info:{database_id}"
        await self._cache_service.delete(cache_key)

        # Send notification
        await self._notification_service.send_notification(
            tenant_id=tenant_id,
            notification_type="file_uploaded",
            title="File Uploaded",
            message=f"File '{file_name}' uploaded to database '{db_info.get('name')}'",
            metadata={
                "database_id": str(database_id),
                "file_name": file_name,
                "file_size": file_size,
            },
        )

        return {
            "file_path": file_path,
            "file_size": file_size,
            "upload_url": upload_result.get("url"),
            "uploaded_at": datetime.utcnow().isoformat(),
        }
