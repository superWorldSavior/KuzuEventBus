"""Kuzu database provisioning adapter.

Extracts the creation aspect from the query execution adapter into a
focused provisioning adapter implementing the DatabaseProvisioningService
port. This makes database lifecycle explicit instead of lazy creation
during first query.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Optional
from uuid import UUID

import kuzu  # type: ignore

from datetime import datetime
from uuid import uuid4

from src.domain.database_management.provisioning import (
    DatabaseProvisioningService,
    DatabaseName,
    DatabaseMetadata,
)
from src.infrastructure.logging.config import infra_logger


class KuzuDatabaseProvisioningAdapter(DatabaseProvisioningService):
    def __init__(self, base_dir: Optional[str] = None) -> None:
        env_dir = os.getenv("KUZU_DATA_DIR")
        chosen = base_dir or env_dir
        if not chosen:
            raise RuntimeError("KUZU_DATA_DIR must be set for database provisioning")
        self._base_dir = Path(chosen).resolve()
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._db_cache: Dict[str, kuzu.Database] = {}

    def _db_path(self, tenant_id: UUID, database_id: UUID) -> Path:
        # Align with query adapter layout: <base>/<tenant>/<database_id>/data.kuzu
        return self._base_dir / str(tenant_id) / str(database_id) / "data.kuzu"

    async def create_database(self, tenant_id: UUID, name: DatabaseName) -> DatabaseMetadata:
        # Generate ID upfront to build path consistent with query adapter
        metadata_id = uuid4()
        db_path = self._db_path(tenant_id, metadata_id)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        key = f"{tenant_id}_{metadata_id}"
        if key in self._db_cache:
            raise RuntimeError("Database already exists (cached)")
        if db_path.exists():
            # If physical path already exists, we still treat as conflict to avoid duplicate metadata entries.
            raise RuntimeError("Database already exists (filesystem)")
        # Create empty database file by instantiating Kuzu Database once
        _db = kuzu.Database(str(db_path))
        self._db_cache[key] = _db
        meta = DatabaseMetadata(
            id=metadata_id,
            tenant_id=tenant_id,
            name=name,
            filesystem_path=str(db_path),
            created_at=datetime.utcnow(),
        )
        infra_logger.info(
            "Kuzu database provisioned", tenant=str(tenant_id), name=name.value, path=str(db_path)
        )
        return meta
