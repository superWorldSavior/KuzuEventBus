"""KuzuQueryService adapter (MVP).

Implements the KuzuQueryService port with minimal behavior to unblock
use cases. Only create_empty_database performs a real action; schema and
stats return placeholders for now.
"""
from __future__ import annotations

import os
import asyncio
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Optional

import kuzu  # type: ignore

from src.domain.shared.ports.database_management import KuzuQueryService


class KuzuQueryServiceAdapter(KuzuQueryService):
    def __init__(self, base_dir: Optional[str] = None) -> None:
        env_dir = os.getenv("KUZU_DATA_DIR")
        chosen = base_dir or env_dir
        if not chosen:
            raise RuntimeError("KUZU_DATA_DIR must be set for KuzuQueryServiceAdapter")
        self._base_dir = Path(chosen).resolve()
        self._base_dir.mkdir(parents=True, exist_ok=True)

    async def validate_query(self, query: str) -> bool:
        return bool(query and query.strip())

    async def execute_query(
        self,
        database_path: str,
        query: str,
        parameters: Dict[str, Any] | None = None,
        timeout_seconds: int = 300,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        # Execute the query against the specific database path.
        # This ensures PITR can replay WAL without referencing tenant/database IDs.
        def _run() -> None:
            db = kuzu.Database(str(database_path))
            conn = kuzu.Connection(db)
            result = conn.execute(query)
            # Exhaust results to ensure side-effects complete
            while result.has_next():
                _ = result.get_next()

        await asyncio.to_thread(_run)
        # This function is an async generator by design to satisfy the port.
        # It intentionally yields nothing (fire-and-forget semantics).
        if False:  # pragma: no cover - maintain async generator shape
            yield {}
        return

    async def get_database_schema(self, database_path: str) -> Dict[str, Any]:
        # MVP placeholder – could introspect when adapter supports it
        return {}

    async def get_database_stats(self, database_path: str) -> Dict[str, Any]:
        # MVP placeholder – could compute file size, table counts etc.
        return {}

    async def create_empty_database(self, database_path: str) -> bool:
        # Ensure directory, create empty kuzu database file
        db_path = Path(database_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)

        def _create() -> bool:
            _ = kuzu.Database(str(db_path))
            return True

        return await asyncio.to_thread(_create)
