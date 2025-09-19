"""Postgres implementation of DatabaseMetadataRepository.

Creates a simple table `kuzu_databases` if it does not exist.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import text

from src.domain.database_management.provisioning import (
    DatabaseMetadataRepository,
    DatabaseMetadata,
    DatabaseName,
)
from src.infrastructure.database.session import SessionFactory
from src.infrastructure.logging.config import infra_logger


_DDL = """
CREATE TABLE IF NOT EXISTS kuzu_databases (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    filesystem_path TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE (tenant_id, name)
);
"""


class PostgresDatabaseMetadataRepository(DatabaseMetadataRepository):
    def __init__(self) -> None:
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with SessionFactory() as session:
            session.execute(text(_DDL))
            session.commit()
        infra_logger.info("Ensured kuzu_databases table exists")

    async def save(self, meta: DatabaseMetadata) -> UUID:
        with SessionFactory() as session:
            session.execute(
                text(
                    """
                    INSERT INTO kuzu_databases (id, tenant_id, name, filesystem_path, created_at)
                    VALUES (:id, :tenant_id, :name, :filesystem_path, :created_at)
                    """
                ),
                {
                    "id": str(meta.id),
                    "tenant_id": str(meta.tenant_id),
                    "name": meta.name.value,
                    "filesystem_path": meta.filesystem_path,
                    "created_at": meta.created_at,
                },
            )
            session.commit()
        return meta.id

    async def find_by_tenant(self, tenant_id: UUID) -> List[DatabaseMetadata]:
        with SessionFactory() as session:
            rows = session.execute(
                text(
                    "SELECT id, tenant_id, name, filesystem_path, created_at FROM kuzu_databases WHERE tenant_id=:tenant_id ORDER BY created_at ASC"
                ),
                {"tenant_id": str(tenant_id)},
            ).fetchall()
        return [
            DatabaseMetadata(
                id=row[0],
                tenant_id=row[1],
                name=DatabaseName(row[2]),
                filesystem_path=row[3],
                created_at=row[4],
            )
            for row in rows
        ]

    async def find_by_name(self, tenant_id: UUID, name: str) -> Optional[DatabaseMetadata]:
        with SessionFactory() as session:
            row = session.execute(
                text(
                    "SELECT id, tenant_id, name, filesystem_path, created_at FROM kuzu_databases WHERE tenant_id=:tenant_id AND name=:name"
                ),
                {"tenant_id": str(tenant_id), "name": name},
            ).fetchone()
        if not row:
            return None
        return DatabaseMetadata(
            id=row[0], tenant_id=row[1], name=DatabaseName(row[2]), filesystem_path=row[3], created_at=row[4]
        )