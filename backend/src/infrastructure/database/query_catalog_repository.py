"""
Postgres implementation of QueryCatalogRepository.

Maintains two tables:
- query_usage: counts and recency of queries per (tenant,database,hash)
- query_favorites: saved queries per (tenant,database) with a max of 10
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import text

from src.domain.shared.ports.query_catalog import QueryCatalogRepository
from src.domain.shared.value_objects import BusinessRuleViolation
from src.infrastructure.database.session import SessionFactory
from src.infrastructure.logging.config import infra_logger


class PostgresQueryCatalogRepository(QueryCatalogRepository):
    def __init__(self) -> None:
        # Schema creation handled by SQLAlchemy models at engine init
        infra_logger.info("Using ORM models for query catalog schema")

    async def increment_usage(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        query_text: str,
        query_hash: str,
        used_at: datetime,
    ) -> None:
        with SessionFactory() as session:
            session.execute(
                text(
                    """
                    INSERT INTO query_usage (tenant_id, database_id, query_hash, query_text, usage_count, last_used_at)
                    VALUES (:tenant_id, :database_id, :query_hash, :query_text, 1, :used_at)
                    ON CONFLICT (tenant_id, database_id, query_hash)
                    DO UPDATE SET
                        usage_count = query_usage.usage_count + 1,
                        query_text = EXCLUDED.query_text,
                        last_used_at = EXCLUDED.last_used_at
                    """
                ),
                {
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "query_hash": query_hash,
                    "query_text": query_text,
                    "used_at": used_at,
                },
            )
            session.commit()

    async def list_most_used(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        with SessionFactory() as session:
            rows = session.execute(
                text(
                    """
                    SELECT u.query_hash, u.query_text, u.usage_count, u.last_used_at
                    FROM query_usage u
                    WHERE u.tenant_id = :tenant_id AND u.database_id = :database_id
                      AND NOT EXISTS (
                        SELECT 1 FROM query_favorites f
                        WHERE f.tenant_id = u.tenant_id
                          AND f.database_id = u.database_id
                          AND f.query_hash = u.query_hash
                      )
                    ORDER BY u.usage_count DESC, u.last_used_at DESC
                    LIMIT :limit
                    """
                ),
                {
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "limit": int(limit),
                },
            ).fetchall()
        return [
            {
                "query_hash": r[0],
                "query_text": r[1],
                "usage_count": int(r[2]),
                "last_used_at": (r[3].isoformat() if isinstance(r[3], datetime) else r[3]),
            }
            for r in rows
        ]

    async def add_favorite(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        query_text: str,
        query_hash: str,
    ) -> None:
        with SessionFactory() as session:
            # If already favorite, noop
            existing = session.execute(
                text(
                    """
                    SELECT 1 FROM query_favorites
                    WHERE tenant_id=:tenant_id AND database_id=:database_id AND query_hash=:query_hash
                    """
                ),
                {
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "query_hash": query_hash,
                },
            ).fetchone()
            if existing:
                return

            # Enforce max 10 favorites
            cnt = session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM query_favorites
                    WHERE tenant_id=:tenant_id AND database_id=:database_id
                    """
                ),
                {"tenant_id": str(tenant_id), "database_id": str(database_id)},
            ).scalar_one()
            if int(cnt) >= 10:
                raise BusinessRuleViolation("Maximum of 10 favorites per database exceeded")

            session.execute(
                text(
                    """
                    INSERT INTO query_favorites (tenant_id, database_id, query_hash, query_text, created_at)
                    VALUES (:tenant_id, :database_id, :query_hash, :query_text, :created_at)
                    """
                ),
                {
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "query_hash": query_hash,
                    "query_text": query_text,
                    "created_at": datetime.utcnow(),
                },
            )
            session.commit()

    async def remove_favorite(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        query_hash: str,
    ) -> bool:
        with SessionFactory() as session:
            res = session.execute(
                text(
                    """
                    DELETE FROM query_favorites
                    WHERE tenant_id=:tenant_id AND database_id=:database_id AND query_hash=:query_hash
                    """
                ),
                {
                    "tenant_id": str(tenant_id),
                    "database_id": str(database_id),
                    "query_hash": query_hash,
                },
            )
            session.commit()
            return (res.rowcount or 0) > 0

    async def list_favorites(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
    ) -> List[Dict[str, Any]]:
        with SessionFactory() as session:
            rows = session.execute(
                text(
                    """
                    SELECT query_hash, query_text, created_at
                    FROM query_favorites
                    WHERE tenant_id=:tenant_id AND database_id=:database_id
                    ORDER BY created_at DESC
                    """
                ),
                {"tenant_id": str(tenant_id), "database_id": str(database_id)},
            ).fetchall()
        return [
            {
                "query_hash": r[0],
                "query_text": r[1],
                "created_at": (r[2].isoformat() if isinstance(r[2], datetime) else r[2]),
            }
            for r in rows
        ]
