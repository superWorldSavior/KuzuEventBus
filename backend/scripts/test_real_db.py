#!/usr/bin/env python3
"""Test avec la vraie DB créée par le worker."""

import os
import kuzu

# Utiliser le même chemin que le worker
KUZU_DATA_DIR = os.getenv("KUZU_DATA_DIR", "/data/kuzu")
TENANT_ID = "tenant-test"  
DATABASE_ID = "0252240f-ecfa-470a-aa5c-84c4109f0a1a"  # De seed_via_api.py

db_path = f"{KUZU_DATA_DIR}/{TENANT_ID}/{DATABASE_ID}/data.kuzu"

print(f"🗂️ Connecting to: {db_path}")
print(f"   Exists: {os.path.exists(db_path)}")

if not os.path.exists(db_path):
    print("❌ Database doesn't exist yet. Run seed_via_api.py first!")
    exit(1)

db = kuzu.Database(db_path)
conn = kuzu.Connection(db)

print("\n📊 Testing MATCH query...")
result = conn.execute("MATCH (p:Person) RETURN p.name, p.age")

rows = []
while result.has_next():
    row = result.get_next()
    rows.append(row)
    print(f"   Row: {row}")

print(f"\n✅ Total rows: {len(rows)}")

if len(rows) == 0:
    print("\n❌ La DB existe mais ne contient aucune donnée !")
    print("   Soit les INSERT ont échoué, soit ils écrivent ailleurs.")
else:
    print(f"\n✅ La DB contient {len(rows)} personnes")
