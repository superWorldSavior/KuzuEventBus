#!/usr/bin/env python3
"""Script pour créer le schéma Kuzu et insérer des données de test."""
import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.infrastructure.kuzu.kuzu_query_execution_adapter import KuzuQueryExecutionAdapter


async def main():
    tenant_id = UUID("24a0261d-f58c-4be7-ae75-81aea3ff5d52")
    database_id = UUID("0252240f-ecfa-470a-aa5c-84c4109f0a1a")
    
    kuzu_dir = os.getenv("KUZU_DATA_DIR", "/tmp/kuzu_data")
    print(f"📁 Using Kuzu data dir: {kuzu_dir}\n")
    
    adapter = KuzuQueryExecutionAdapter(base_dir=kuzu_dir)
    await adapter.ensure_initialized(tenant_id, database_id)
    
    queries = [
        ("Create Person node table", "CREATE NODE TABLE Person(name STRING, age INT64, PRIMARY KEY(name))"),
        ("Create KNOWS rel table", "CREATE REL TABLE KNOWS(FROM Person TO Person, since STRING)"),
        ("Insert Alice", "CREATE (a:Person {name: 'Alice', age: 30})"),
        ("Insert Bob", "CREATE (b:Person {name: 'Bob', age: 25})"),
        ("Insert Charlie", "CREATE (c:Person {name: 'Charlie', age: 35})"),
        ("Insert Diana", "CREATE (d:Person {name: 'Diana', age: 28})"),
        ("Link Alice->Bob", "MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS {since: '2020'}]->(b)"),
        ("Link Alice->Charlie", "MATCH (a:Person {name: 'Alice'}), (c:Person {name: 'Charlie'}) CREATE (a)-[:KNOWS {since: '2021'}]->(c)"),
        ("Link Bob->Diana", "MATCH (b:Person {name: 'Bob'}), (d:Person {name: 'Diana'}) CREATE (b)-[:KNOWS {since: '2022'}]->(d)"),
        ("Link Charlie->Diana", "MATCH (c:Person {name: 'Charlie'}), (d:Person {name: 'Diana'}) CREATE (c)-[:KNOWS {since: '2023'}]->(d)"),
    ]
    
    print("="*60)
    print("CREATING SCHEMA AND DATA")
    print("="*60 + "\n")
    
    for label, query in queries:
        print(f"▶ {label}...")
        result = await adapter.execute_query(tenant_id, database_id, query)
        if result.get('error'):
            print(f"  ❌ Error: {result['error']}")
        else:
            print(f"  ✅ Success (rows: {result.get('rows_returned', 0)})")
    
    print("\n" + "="*60)
    print("VERIFICATION: Count persons")
    print("="*60)
    result = await adapter.execute_query(tenant_id, database_id, "MATCH (p:Person) RETURN count(p) AS count")
    print(f"Result: {result}")
    if result.get('results'):
        print(f"✅ Found {result['results'][0] if result['results'] else 0} persons")
    
    print("\n" + "="*60)
    print("VERIFICATION: List relationships")
    print("="*60)
    result = await adapter.execute_query(
        tenant_id, database_id,
        "MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name, r.since, b.name LIMIT 10"
    )
    print(f"Rows returned: {result.get('rows_returned', 0)}")
    if result.get('results'):
        print("✅ Relationships:")
        for row in result['results']:
            print(f"  - {row}")
    else:
        print(f"❌ No relationships found. Error: {result.get('error', 'N/A')}")
    
    print("\n" + "="*60)
    print("VERIFICATION: Graph query (for dashboard)")
    print("="*60)
    result = await adapter.execute_query(
        tenant_id, database_id,
        """MATCH (a:Person)-[e:KNOWS]->(b:Person)
           RETURN id(a) AS a_id, labels(a) AS a_labels, a AS a_props,
                  id(b) AS b_id, labels(b) AS b_labels, b AS b_props,
                  type(e) AS e_type
           LIMIT 10"""
    )
    print(f"Rows returned: {result.get('rows_returned', 0)}")
    if result.get('results'):
        print("✅ Graph data available!")
        for i, row in enumerate(result['results'][:2]):
            print(f"  Row {i}: {row}")
    else:
        print(f"❌ No graph data. Error: {result.get('error', 'N/A')}")


if __name__ == "__main__":
    asyncio.run(main())
