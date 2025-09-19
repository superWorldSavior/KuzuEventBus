"""Domain value objects for database provisioning.

This module contains provisioning value objects and validation error types.
The provisioning ports (interfaces) are centralized in
`src/domain/shared/ports/database_management.py`.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
from datetime import datetime
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
