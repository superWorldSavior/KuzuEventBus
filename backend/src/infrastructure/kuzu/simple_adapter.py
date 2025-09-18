"""
Simple Kuzu database adapter.
YAGNI implementation - basic query execution only.
"""
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import kuzu

from src.domain.shared.ports.query_execution import QueryExecutionPort
from src.domain.shared.value_objects import EntityId


class SimpleKuzuAdapter(QueryExecutionPort):
    """Minimal Kuzu database adapter."""

    def __init__(self):
        # Use temp directory for YAGNI
        self._temp_dir = tempfile.mkdtemp()
        self._databases: Dict[str, kuzu.Database] = {}
        self._connections: Dict[str, kuzu.Connection] = {}

    async def execute_query(
        self,
        tenant_id: EntityId,
        database_name: str,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute Cypher query."""
        try:
            conn = await self._get_connection(tenant_id, database_name)
            
            # Simple query execution - no parameter binding for now
            result = conn.execute(query)
            
            # Convert to simple format
            rows = []
            while result.has_next():
                rows.append(result.get_next())
            
            return {
                "success": True,
                "rows": rows,
                "row_count": len(rows),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "rows": [],
                "row_count": 0,
            }

    async def validate_query_syntax(self, query: str) -> Dict[str, Any]:
        """Basic syntax validation."""
        # Very simple validation - just check if it's not empty
        if not query.strip():
            return {"valid": False, "error": "Query cannot be empty"}
        
        return {"valid": True, "error": None}

    async def get_query_execution_plan(
        self, tenant_id: EntityId, database_name: str, query: str
    ) -> Dict[str, Any]:
        """Get query execution plan - simplified."""
        return {
            "plan": f"PLAN FOR: {query[:50]}...",
            "estimated_cost": 1.0,
        }

    async def cancel_query(self, tenant_id: EntityId, query_id: str) -> bool:
        """Cancel query - not implemented for YAGNI."""
        return True

    async def _get_connection(self, tenant_id: EntityId, database_name: str) -> kuzu.Connection:
        """Get or create database connection."""
        key = f"{tenant_id.value}_{database_name}"
        
        if key not in self._connections:
            # Create database if it doesn't exist
            db_path = Path(self._temp_dir) / f"{key}.kuzu"
            db = kuzu.Database(str(db_path))
            conn = kuzu.Connection(db)
            
            self._databases[key] = db
            self._connections[key] = conn
        
        return self._connections[key]