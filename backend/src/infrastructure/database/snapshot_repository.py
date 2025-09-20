"""Postgres implementation of SnapshotRepository.

Stores snapshot metadata in `kuzu_db_snapshots` table.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import text

from src.domain.shared.ports.database_management import SnapshotRepository
from src.infrastructure.database.session import SessionFactory
from src.infrastructure.logging.config import infra_logger


_DDL = """
CREATE TABLE IF NOT EXISTS kuzu_db_snapshots (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    database_id UUID NOT NULL,
    object_key TEXT NOT NULL,
    checksum TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE (database_id, object_key)
);
"""


class PostgresSnapshotRepository(SnapshotRepository):
    def __init__(self) -> None:
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with SessionFactory() as session:
            session.execute(text(_DDL))
            session.commit()
        infra_logger.info("Ensured kuzu_db_snapshots table exists")

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
        snapshot_id = uuid4()
        with SessionFactory() as session:
            session.execute(
                text(
                    """
                    INSERT INTO kuzu_db_snapshots
                    (id, tenant_id, database_id, object_key, checksum, size_bytes, created_at)
                    VALUES (:id, :tenant_id, :database_id, :object_key, :checksum, :size_bytes, :created_at)
                    """
                ),
                {
                    "id": str(snapshot_id),
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "object_key": object_key,
                    "checksum": checksum,
                    "size_bytes": size_bytes,
                    "created_at": datetime.fromisoformat(created_at) if isinstance(created_at, str) else created_at,
                },
            )
            session.commit()
        return snapshot_id

    async def list_by_database(self, tenant_id: UUID, database_id: UUID) -> List[Dict[str, Any]]:
        with SessionFactory() as session:
            rows = session.execute(
                text(
                    """
                    SELECT id, tenant_id, database_id, object_key, checksum, size_bytes, created_at
                    FROM kuzu_db_snapshots
                    WHERE tenant_id=:tenant_id AND database_id=:database_id
                    ORDER BY created_at DESC
                    """
                ),
                {"tenant_id": str(tenant_id), "database_id": str(database_id)},
            ).fetchall()
        return [
            {
                "id": r[0],
                "tenant_id": str(r[1]),
                "database_id": str(r[2]),
                "object_key": r[3],
                "checksum": r[4],
                "size_bytes": int(r[5]),
                "created_at": r[6].isoformat() if isinstance(r[6], datetime) else r[6],
            }
            for r in rows
        ]

    async def find_by_id(self, snapshot_id: UUID) -> Optional[Dict[str, Any]]:
        with SessionFactory() as session:
            r = session.execute(
                text(
                    "SELECT id, tenant_id, database_id, object_key, checksum, size_bytes, created_at\n                     FROM kuzu_db_snapshots WHERE id=:id"
                ),
                {"id": str(snapshot_id)},
            ).fetchone()
        if not r:
            return None
        return {
            "id": r[0],
            "tenant_id": str(r[1]),
            "database_id": str(r[2]),
            "object_key": r[3],
            "checksum": r[4],
            "size_bytes": int(r[5]),
            "created_at": r[6].isoformat() if isinstance(r[6], datetime) else r[6],
        }

    async def delete(self, snapshot_id: UUID) -> bool:
        with SessionFactory() as session:
            res = session.execute(text("DELETE FROM kuzu_db_snapshots WHERE id=:id"), {"id": str(snapshot_id)})
            session.commit()
            return res.rowcount > 0
