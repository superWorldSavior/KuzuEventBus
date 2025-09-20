"""Postgres implementation of KuzuDatabaseRepository port.

Backed by the `kuzu_databases` table (same schema used by
PostgresDatabaseMetadataRepository), but exposes dict-based API as
required by the KuzuDatabaseRepository port in the domain.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import text

from src.domain.shared.ports.database_management import KuzuDatabaseRepository
from src.infrastructure.database.session import SessionFactory
from src.infrastructure.logging.config import infra_logger


class PostgresKuzuDatabaseRepository(KuzuDatabaseRepository):
    def __init__(self) -> None:
        # Ensure table exists (delegated to metadata repository elsewhere),
        # here we assume schema is present. Fail fast on first query otherwise.
        pass

    async def save_database_metadata(
        self,
        tenant_id: UUID,
        database_name: str,
        file_path: str,
        size_bytes: int,
        metadata: Dict[str, Any],
    ) -> UUID:
        db_id: UUID = metadata.get("id") or uuid4()
        created_at: datetime | None = metadata.get("created_at")
        if created_at is None:
            created_at = datetime.utcnow()
        with SessionFactory() as session:
            session.execute(
                text(
                    """
                    INSERT INTO kuzu_databases (id, tenant_id, name, filesystem_path, created_at)
                    VALUES (:id, :tenant_id, :name, :filesystem_path, :created_at)
                    ON CONFLICT (tenant_id, name) DO NOTHING
                    """
                ),
                {
                    "id": str(db_id),
                    "tenant_id": str(tenant_id),
                    "name": database_name,
                    "filesystem_path": file_path,
                    "created_at": created_at,
                },
            )
            session.commit()
        infra_logger.info(
            "Saved database metadata",
            database_id=str(db_id),
            tenant_id=str(tenant_id),
            name=database_name,
        )
        return db_id

    async def find_by_id(self, database_id: UUID) -> Optional[Dict[str, Any]]:
        with SessionFactory() as session:
            row = session.execute(
                text(
                    "SELECT id, tenant_id, name, filesystem_path, created_at FROM kuzu_databases WHERE id=:id"
                ),
                {"id": str(database_id)},
            ).fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "tenant_id": str(row[1]),
            "name": row[2],
            "file_path": row[3],
            "created_at": row[4].isoformat() if isinstance(row[4], datetime) else row[4],
            "size_bytes": 0,
            "table_count": 0,
        }

    async def find_by_tenant(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        with SessionFactory() as session:
            rows = session.execute(
                text(
                    "SELECT id, tenant_id, name, filesystem_path, created_at FROM kuzu_databases WHERE tenant_id=:tenant ORDER BY created_at ASC"
                ),
                {"tenant": str(tenant_id)},
            ).fetchall()
        results: List[Dict[str, Any]] = []
        for r in rows:
            results.append(
                {
                    "id": r[0],
                    "tenant_id": str(r[1]),
                    "name": r[2],
                    "file_path": r[3],
                    "created_at": r[4].isoformat() if isinstance(r[4], datetime) else r[4],
                    "size_bytes": 0,
                    "table_count": 0,
                }
            )
        return results

    async def delete(self, database_id: UUID) -> bool:
        with SessionFactory() as session:
            res = session.execute(
                text("DELETE FROM kuzu_databases WHERE id=:id"), {"id": str(database_id)}
            )
            session.commit()
            return res.rowcount > 0
