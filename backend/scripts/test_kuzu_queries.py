#!/usr/bin/env python3
"""Script de test pour vérifier les retours de Kuzu directement."""
import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID

# Add parent directory to path to import src modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.infrastructure.kuzu.kuzu_query_execution_adapter import KuzuQueryExecutionAdapter


async def main():
    # Use the same tenant/database from your tests
    tenant_id = UUID("24a0261d-f58c-4be7-ae75-81aea3ff5d52")  # Adjust if needed
    database_id = UUID("0252240f-ecfa-470a-aa5c-84c4109f0a1a")  # Your actual DB ID
    
    # Get KUZU_DATA_DIR from env or use default
    kuzu_dir = os.getenv("KUZU_DATA_DIR", "/tmp/kuzu_data")
    print(f"📁 Using Kuzu data dir: {kuzu_dir}")
    
    adapter = KuzuQueryExecutionAdapter(base_dir=kuzu_dir)
    await adapter.ensure_initialized(tenant_id, database_id)
    
    print("\n" + "="*60)
    print("TEST 1: Simple CREATE without RETURN")
    print("="*60)
    query1 = "CREATE (a:Person {name: 'TestUser', age: 42})"
    result1 = await adapter.execute_query(tenant_id, database_id, query1)
    print(f"Result type: {type(result1)}")
    print(f"Result keys: {result1.keys() if isinstance(result1, dict) else 'N/A'}")
    print(f"Full result: {result1}")
    print(f"Rows count: {len(result1.get('results', []))}")
    
    print("\n" + "="*60)
    print("TEST 2: CREATE with RETURN")
    print("="*60)
    query2 = "CREATE (x:Person {name: 'Alice', age: 30})-[:KNOWS]->(y:Person {name: 'Bob', age: 25}) RETURN x, y"
    result2 = await adapter.execute_query(tenant_id, database_id, query2)
    print(f"Result type: {type(result2)}")
    print(f"Result keys: {result2.keys() if isinstance(result2, dict) else 'N/A'}")
    print(f"Full result: {result2}")
    rows = result2.get('results', [])
    print(f"Rows count: {len(rows)}")
    if rows:
        print(f"First row type: {type(rows[0])}")
        print(f"First row: {rows[0]}")
    
    print("\n" + "="*60)
    print("TEST 3: MATCH query")
    print("="*60)
    query3 = "MATCH (p:Person) RETURN p.name AS name, p.age AS age LIMIT 5"
    result3 = await adapter.execute_query(tenant_id, database_id, query3)
    print(f"Result type: {type(result3)}")
    print(f"Result keys: {result3.keys() if isinstance(result3, dict) else 'N/A'}")
    print(f"Full result: {result3}")
    rows3 = result3.get('results', [])
    print(f"Rows count: {len(rows3)}")
    if rows3:
        print("Sample rows:")
        for i, row in enumerate(rows3[:3]):
            print(f"  Row {i}: type={type(row)}, value={row}")
    
    print("\n" + "="*60)
    print("TEST 4: Graph query (EXACT dashboard query)")
    print("="*60)
    result4 = await adapter.execute_query(
        tenant_id, database_id,
        """MATCH (a:Person)-[e:KNOWS]->(b:Person)
           RETURN a.name AS a_name, a.age AS a_age,
                  b.name AS b_name, b.age AS b_age,
                  e.since AS e_since
           LIMIT 100"""
    )
    print(f"Result type: {type(result4)}")
    print(f"Result keys: {result4.keys() if isinstance(result4, dict) else 'N/A'}")
    rows4 = result4.get('results', [])
    print(f"Rows count: {len(rows4)}")
    if rows4:
        print("Sample graph rows:")
        for i, row in enumerate(rows4[:2]):
            print(f"  Row {i}: {row}")
    else:
        print("  No relationships found (empty graph)")


if __name__ == "__main__":
    asyncio.run(main())
