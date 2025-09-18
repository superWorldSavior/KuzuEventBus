"""Kuzu query execution adapter implementing QueryExecutionService.

Bridges the domain port to the Kuzu engine. YAGNI-friendly: minimal
feature set (execute + explain). Adds timing & structured result shape.
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

import kuzu  # type: ignore

from src.domain.shared.ports.query_execution import QueryExecutionService


class KuzuQueryExecutionAdapter(QueryExecutionService):
    def __init__(self, base_dir: Optional[str] = None) -> None:
        # Strict: require an explicit base directory (no silent temp fallback)
        env_dir = os.getenv("KUZU_DATA_DIR")
        chosen = base_dir or env_dir
        if not chosen:
            raise RuntimeError(
                "KUZU_DATA_DIR environment variable must be set (no fallback)."
            )
        self._base_dir = Path(chosen).resolve()
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._databases: Dict[str, kuzu.Database] = {}
        self._connections: Dict[str, kuzu.Connection] = {}

    def _db_file_path(self, tenant_id: UUID, database_id: UUID) -> Path:
        # Structure: <base>/<tenant>/<database>/data.kuzu
        path = self._base_dir / str(tenant_id) / str(database_id)
        path.mkdir(parents=True, exist_ok=True)
        return path / "data.kuzu"

    async def ensure_initialized(self, tenant_id: UUID, database_id: UUID) -> None:
        key = f"{tenant_id}_{database_id}"
        if key in self._connections:
            return
        db_path = self._db_file_path(tenant_id, database_id)
        db = kuzu.Database(str(db_path))
        conn = kuzu.Connection(db)
        self._databases[key] = db
        self._connections[key] = conn

    async def execute_query(
        self,
        tenant_id: UUID,
        database_id: UUID,
        cypher: str,
        parameters: Optional[Dict[str, Any]] = None,
        timeout_seconds: int = 30,
    ) -> Dict[str, Any]:
        start = time.time()
        try:
            await self.ensure_initialized(tenant_id, database_id)
            conn = await self._get_connection(tenant_id, database_id)
            result = conn.execute(cypher)
            rows: List[Any] = []
            while result.has_next():
                rows.append(result.get_next())
            duration_ms = (time.time() - start) * 1000
            return {
                "results": rows,
                "rows_returned": len(rows),
                "execution_time_ms": round(duration_ms, 2),
                "meta": {"tenant_id": str(tenant_id), "database_id": str(database_id)},
            }
        except Exception as e:  # noqa: BLE001
            duration_ms = (time.time() - start) * 1000
            return {
                "results": [],
                "rows_returned": 0,
                "execution_time_ms": round(duration_ms, 2),
                "error": str(e),
                "meta": {"tenant_id": str(tenant_id), "database_id": str(database_id)},
            }

    async def explain_query(
        self,
        tenant_id: UUID,
        database_id: UUID,
        cypher: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # Placeholder – real EXPLAIN/PROFILE when supported via adapter
        return {
            "plan": f"EXPLAIN (mock) {cypher[:60]}...",
            "estimated_cost": 1.0,
            "meta": {"tenant_id": str(tenant_id), "database_id": str(database_id)},
        }

    async def _get_connection(self, tenant_id: UUID, database_id: UUID) -> kuzu.Connection:
        key = f"{tenant_id}_{database_id}"
        if key not in self._connections:
            # Should already be initialized via ensure_initialized
            await self.ensure_initialized(tenant_id, database_id)
        return self._connections[key]
