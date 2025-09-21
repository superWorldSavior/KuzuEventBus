"""
Query Catalog domain ports.

Provides a repository interface to persist and query per-tenant, per-database
query usage and favorites.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Protocol, runtime_checkable
from uuid import UUID


@runtime_checkable
class QueryCatalogRepository(Protocol):
    async def increment_usage(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        query_text: str,
        query_hash: str,
        used_at: datetime,
    ) -> None:
        """Record a usage for a query (upsert + update last_used_at)."""
        ...

    async def list_most_used(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        limit: int = 10,
    ) -> List[Dict]:
        """Return most used queries (excluding favorites)."""
        ...

    async def add_favorite(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        query_text: str,
        query_hash: str,
    ) -> None:
        """Save a query as favorite. Must enforce max 10 per (tenant,database)."""
        ...

    async def remove_favorite(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
        query_hash: str,
    ) -> bool:
        """Remove a favorite by hash. Returns True if removed, False if absent."""
        ...

    async def list_favorites(
        self,
        *,
        tenant_id: UUID,
        database_id: UUID,
    ) -> List[Dict]:
        """List current favorites for a tenant+database."""
        ...
