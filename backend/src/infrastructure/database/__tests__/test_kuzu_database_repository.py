from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

import pytest
from sqlalchemy.exc import OperationalError

from src.infrastructure.database.database_metadata_repository import (
    PostgresDatabaseMetadataRepository,
)
from src.infrastructure.database.kuzu_database_repository import (
    PostgresKuzuDatabaseRepository,
)


@pytest.fixture(scope="module")
def repo() -> PostgresKuzuDatabaseRepository:
    # Ensure schema exists using the metadata repository DDL
    try:
        _ = PostgresDatabaseMetadataRepository()
        # Touch DB to fail fast if unavailable
        asyncio.run(
            PostgresKuzuDatabaseRepository().find_by_tenant(uuid.uuid4())
        )
        return PostgresKuzuDatabaseRepository()
    except (RuntimeError, OperationalError) as exc:  # pragma: no cover - skip when DB missing
        pytest.skip(f"PostgreSQL repository unavailable: {exc}")


@pytest.mark.asyncio
async def test_save_find_delete_cycle(repo: PostgresKuzuDatabaseRepository) -> None:
    tenant_id = uuid.uuid4()
    name = f"db_{uuid.uuid4().hex[:6]}"
    file_path = f"/tmp/{tenant_id}/{uuid.uuid4()}/data.kuzu"
    db_id = await repo.save_database_metadata(
        tenant_id=tenant_id,
        database_name=name,
        file_path=file_path,
        size_bytes=0,
        metadata={"created_at": datetime.utcnow()},
    )

    found = await repo.find_by_id(db_id)
    assert found is not None
    assert found["name"] == name
    assert found["file_path"] == file_path

    by_tenant = await repo.find_by_tenant(tenant_id)
    assert any(str(x["id"]) == str(db_id) for x in by_tenant)

    ok = await repo.delete(db_id)
    assert ok is True
