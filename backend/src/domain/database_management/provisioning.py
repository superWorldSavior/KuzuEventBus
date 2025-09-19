"""Domain value objects and entities for database provisioning.

Database lifecycle management including bucket and Kuzu database creation
with metadata persistence for explicit resource management.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
from datetime import datetime
from typing import Protocol, runtime_checkable
from uuid import UUID, uuid4


class ProvisioningValidationError(ValueError):
    """Raised when a provisioning value object is invalid."""


_DB_NAME_PATTERN = re.compile(r"^[a-z0-9_-]{3,40}$")


@dataclass(frozen=True)
class DatabaseName:
    value: str

    def __post_init__(self) -> None:  # fail fast validation
        if not _DB_NAME_PATTERN.match(self.value):
            raise ProvisioningValidationError(
                "DatabaseName must be 3-40 chars, lowercase, [a-z0-9_-]"
            )


@dataclass(frozen=True)
class DatabaseMetadata:
    id: UUID
    tenant_id: UUID
    name: DatabaseName
    filesystem_path: str
    created_at: datetime

    @staticmethod
    def create(tenant_id: UUID, name: DatabaseName, filesystem_path: str) -> "DatabaseMetadata":
        return DatabaseMetadata(
            id=uuid4(),
            tenant_id=tenant_id,
            name=name,
            filesystem_path=filesystem_path,
            created_at=datetime.utcnow(),
        )


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

    async def create_database(self, tenant_id: UUID, name: DatabaseName) -> DatabaseMetadata:
        """Create a new database (fails if already exists for that name)."""
        ...


@runtime_checkable
class DatabaseMetadataRepository(Protocol):
    """Port for persisting and querying database metadata records."""

    async def save(self, meta: DatabaseMetadata) -> UUID:  # returns meta.id
        ...

    async def find_by_tenant(self, tenant_id: UUID) -> list[DatabaseMetadata]:
        ...

    async def find_by_name(self, tenant_id: UUID, name: str) -> DatabaseMetadata | None:
        ...