from __future__ import annotations

from datetime import datetime
from uuid import uuid4

import pytest
import asyncio

from src.infrastructure.database.query_catalog_repository import PostgresQueryCatalogRepository
from src.domain.query_catalog.value_objects import QueryText, QueryHash


@pytest.mark.integration
def test_postgres_query_catalog_repository_usage_and_favorites(monkeypatch, tmp_path):
    # Ensure test environment variables are set
    monkeypatch.setenv("ENVIRONMENT", "test")

    repo = PostgresQueryCatalogRepository()

    tenant_id = uuid4()
    database_id = uuid4()

    q1 = QueryText("  MATCH   (n)   RETURN   n  ")
    h1 = QueryHash.from_query_text(q1)

    q2 = QueryText("RETURN 1 AS x")
    h2 = QueryHash.from_query_text(q2)

    # Increment usage: q1 -> 5 times, q2 -> 2 times
    for _ in range(5):
        asyncio.run(
            repo.increment_usage(
                tenant_id=tenant_id,
                database_id=database_id,
                query_text=q1.value,
                query_hash=h1.value,
                used_at=datetime.utcnow(),
            )
        )
    for _ in range(2):
        asyncio.run(
            repo.increment_usage(
                tenant_id=tenant_id,
                database_id=database_id,
                query_text=q2.value,
                query_hash=h2.value,
                used_at=datetime.utcnow(),
            )
        )

    # Add favorite for q1 (the most used)
    asyncio.run(
        repo.add_favorite(
            tenant_id=tenant_id,
            database_id=database_id,
            query_text=q1.value,
            query_hash=h1.value,
        )
    )

    # Popular should exclude q1 and include q2
    items = asyncio.run(
        repo.list_most_used(tenant_id=tenant_id, database_id=database_id, limit=10)
    )
    assert all(item["query_hash"] != h1.value for item in items)
    assert any(item["query_hash"] == h2.value for item in items)

    # Favorites should include q1
    favs = asyncio.run(
        repo.list_favorites(tenant_id=tenant_id, database_id=database_id)
    )
    assert any(f["query_hash"] == h1.value for f in favs)

    # Remove favorite
    removed = asyncio.run(
        repo.remove_favorite(
            tenant_id=tenant_id,
            database_id=database_id,
            query_hash=h1.value,
        )
    )
    assert removed is True
    favs2 = asyncio.run(
        repo.list_favorites(tenant_id=tenant_id, database_id=database_id)
    )
    assert all(f["query_hash"] != h1.value for f in favs2)


@pytest.mark.integration
def test_postgres_query_catalog_repository_enforces_max_10_favorites(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "test")

    repo = PostgresQueryCatalogRepository()

    tenant_id = uuid4()
    database_id = uuid4()

    # Add 10 distinct favorites
    for i in range(10):
        q = QueryText(f"RETURN {i} AS x")
        h = QueryHash.from_query_text(q)
        asyncio.run(
            repo.add_favorite(
                tenant_id=tenant_id,
                database_id=database_id,
                query_text=q.value,
                query_hash=h.value,
            )
        )

    # 11th should raise BusinessRuleViolation
    from src.domain.shared.value_objects import BusinessRuleViolation

    q11 = QueryText("RETURN 999 AS x")
    h11 = QueryHash.from_query_text(q11)

    with pytest.raises(BusinessRuleViolation):
        asyncio.run(
            repo.add_favorite(
                tenant_id=tenant_id,
                database_id=database_id,
                query_text=q11.value,
                query_hash=h11.value,
            )
        )
