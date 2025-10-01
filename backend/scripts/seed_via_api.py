#!/usr/bin/env python3
"""Seed data via REST API to avoid database lock conflicts."""
import requests
import time
import psycopg2

# Configuration
API_BASE = "http://localhost:8200/api/v1"
DATABASE_ID = "0252240f-ecfa-470a-aa5c-84c4109f0a1a"

def get_api_key():
    """Fetch API key from PostgreSQL."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5433,
            database="kuzu_eventbus",
            user="kuzu_user",
            password="kuzu_password"
        )
        cur = conn.cursor()
        cur.execute("SELECT api_key FROM customers LIMIT 1")
        result = cur.fetchone()
        cur.close()
        conn.close()
        if result:
            print(f"✅ Retrieved API key from database")
            return result[0]
        else:
            print("❌ No API key found in database")
            return None
    except Exception as e:
        print(f"❌ Failed to get API key: {e}")
        return None

API_KEY = "kb_gmwMuXu2g0zGymPtAWBlVGbvNCeuB9ZEjzSfZcU90No"

def submit_query(query: str):
    """Submit a query and wait for completion."""
    print(f"\n📤 Submitting: {query[:80]}...")
    
    # Submit query
    try:
        headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}
        resp = requests.post(
            f"{API_BASE}/databases/{DATABASE_ID}/query",
            json={"query": query},
            headers=headers,
            timeout=30.0  # 30 second timeout for schema creation
        )
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    
    if resp.status_code != 202:  # Async query returns 202 Accepted
        print(f"❌ Submit failed: {resp.status_code} - {resp.text}")
        return False
    
    tx_id = resp.json().get("transaction_id")
    print(f"✅ Submitted, tx_id: {tx_id}")
    
    # Wait for completion (poll results endpoint)
    for _ in range(20):  # Max 10 seconds
        time.sleep(0.5)
        try:
            headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}
            result_resp = requests.get(
                f"{API_BASE}/jobs/{tx_id}/results",
                headers=headers,
                timeout=10.0
            )
        except requests.exceptions.RequestException as e:
            print(f"❌ Poll failed: {e}")
            continue
        
        if result_resp.status_code == 200:
            # L'endpoint /jobs/{tx_id}/results retourne directement {"results": [...]}
            # Un 200 signifie que le job est completed
            result = result_resp.json()
            rows_count = len(result.get("results", []))
            print(f"✅ Completed, rows: {rows_count}")
            return True
        elif result_resp.status_code == 400:
            # Job pas encore completed
            continue
        else:
            print(f"❌ Unexpected status: {result_resp.status_code} - {result_resp.text[:200]}")
            return False
    
    print("⏱️ Timeout waiting for completion")
    return False

def main():
    print("=" * 60)
    print("🌱 SEEDING DATABASE VIA API")
    print("=" * 60)
    
    queries = [
        # 1. Create schema
        "CREATE NODE TABLE IF NOT EXISTS Person(name STRING, age INT64, PRIMARY KEY(name))",
        "CREATE REL TABLE IF NOT EXISTS KNOWS(FROM Person TO Person, since INT64)",
        
        # 2. Create nodes
        "CREATE (a:Person {name: 'Alice', age: 30})",
        "CREATE (b:Person {name: 'Bob', age: 25})",
        "CREATE (c:Person {name: 'Carol', age: 35})",
        "CREATE (d:Person {name: 'Dave', age: 40})",
        
        # 3. Create relationships
        "MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS {since: 2020}]->(b)",
        "MATCH (b:Person {name: 'Bob'}), (c:Person {name: 'Carol'}) CREATE (b)-[:KNOWS {since: 2021}]->(c)",
        "MATCH (c:Person {name: 'Carol'}), (d:Person {name: 'Dave'}) CREATE (c)-[:KNOWS {since: 2019}]->(d)",
        "MATCH (d:Person {name: 'Dave'}), (a:Person {name: 'Alice'}) CREATE (d)-[:KNOWS {since: 2022}]->(a)",
    ]
    
    for i, query in enumerate(queries, 1):
        print(f"\n[{i}/{len(queries)}]")
        if not submit_query(query):
            print(f"❌ Seeding failed at step {i}")
            return
        time.sleep(0.2)  # Small delay between queries
    
    print("\n" + "=" * 60)
    print("🎉 SEEDING COMPLETED! Testing MATCH query...")
    print("=" * 60)
    
    # Test query
    submit_query("MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name, r.since, b.name")
    
    print("\n✅ All done! You should now see 4 results in the test query.")

if __name__ == "__main__":
    main()
