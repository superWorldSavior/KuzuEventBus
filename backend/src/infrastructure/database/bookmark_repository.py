"""Postgres implementation of BookmarkRepository for PITR bookmarks."""
from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import text

from src.domain.shared.ports.database_management import BookmarkRepository
from src.infrastructure.database.session import SessionFactory
from src.infrastructure.logging.config import infra_logger


_DDL = """
CREATE TABLE IF NOT EXISTS pitr_bookmarks (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    database_id UUID NOT NULL,
    name TEXT NOT NULL,
    ts TIMESTAMP NOT NULL,
    UNIQUE (tenant_id, database_id, name)
);
"""


class PostgresBookmarkRepository(BookmarkRepository):
    def __init__(self) -> None:
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with SessionFactory() as session:
            session.execute(text(_DDL))
            session.commit()
        infra_logger.info("Ensured pitr_bookmarks table exists")

    async def add(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        name: str,
        timestamp: str,
    ) -> UUID:
        bookmark_id = uuid4()
        with SessionFactory() as session:
            session.execute(
                text(
                    """
                    INSERT INTO pitr_bookmarks (id, tenant_id, database_id, name, ts)
                    VALUES (:id, :tenant_id, :database_id, :name, :ts)
                    ON CONFLICT (tenant_id, database_id, name)
                    DO UPDATE SET ts = EXCLUDED.ts
                    """
                ),
                {
                    "id": str(bookmark_id),
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "name": name,
                    "ts": datetime.fromisoformat(timestamp) if isinstance(timestamp, str) else timestamp,
                },
            )
            session.commit()
        return bookmark_id

    async def list_by_database(self, tenant_id: UUID, database_id: UUID) -> List[Dict[str, Any]]:
        with SessionFactory() as session:
            rows = session.execute(
                text(
                    """
                    SELECT id, name, ts
                    FROM pitr_bookmarks
                    WHERE tenant_id=:tenant_id AND database_id=:database_id
                    ORDER BY ts ASC
                    """
                ),
                {"tenant_id": str(tenant_id), "database_id": str(database_id)},
            ).fetchall()
        return [
            {
                "id": r[0],
                "name": r[1],
                "timestamp": r[2].isoformat() if isinstance(r[2], datetime) else r[2],
            }
            for r in rows
        ]

    async def delete(self, tenant_id: UUID, database_id: UUID, name: str) -> bool:
        with SessionFactory() as session:
            res = session.execute(
                text(
                    "DELETE FROM pitr_bookmarks WHERE tenant_id=:tenant_id AND database_id=:database_id AND name=:name"
                ),
                {"tenant_id": str(tenant_id), "database_id": str(database_id), "name": name},
            )
            session.commit()
            return res.rowcount > 0
