#!/usr/bin/env python3
"""Test direct de Kuzu pour vérifier extraction des résultats."""

import kuzu
import tempfile
import shutil

# Créer une DB temporaire
temp_dir = tempfile.mkdtemp()
print(f"🗂️ Using temp DB: {temp_dir}")

db = kuzu.Database(temp_dir)
conn = kuzu.Connection(db)

print("1️⃣ CREATE NODE TABLE")
result = conn.execute("CREATE NODE TABLE Person(name STRING, age INT64, PRIMARY KEY(name))")
print(f"   has_next(): {result.has_next()}")

print("\n2️⃣ CREATE nodes")
result = conn.execute("CREATE (a:Person {name: 'Alice', age: 30})")
print(f"   has_next(): {result.has_next()}")

result = conn.execute("CREATE (b:Person {name: 'Bob', age: 25})")
print(f"   has_next(): {result.has_next()}")

print("\n3️⃣ MATCH query (devrait retourner 2 rows)")
result = conn.execute("MATCH (p:Person) RETURN p.name, p.age")
print(f"   has_next(): {result.has_next()}")

rows = []
while result.has_next():
    row = result.get_next()
    rows.append(row)
    print(f"   Row: {row}")

print(f"\n✅ Total rows extracted: {len(rows)}")

if len(rows) == 0:
    print("\n❌ PROBLÈME: Kuzu ne retourne pas de données même pour un SELECT !")
else:
    print("\n✅ Kuzu fonctionne correctement")

# Cleanup
print(f"\n🧹 Cleaning up {temp_dir}")
shutil.rmtree(temp_dir)
