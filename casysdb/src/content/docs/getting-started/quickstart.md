---
title: Quick Start
description: Get started with CasysDB in 5 minutes
head: []
sidebar:
  order: 2
---

This guide will get you up and running with CasysDB in less than 5 minutes.

## 1. Install CasysDB

```bash
# Python
pip install casys-db
```

## 2. Create Your First Database

```python
from casys_db import Database

# Create an in-memory database
db = Database(":memory:")

# Or persist to disk
# db = Database("path/to/my_graph.db")

# Get the default branch
branch = db.default_branch()
```

## 3. Create Nodes with GQL

```python
# Execute raw GQL
result = branch.query("""
  CREATE (alice:Person {name: 'Alice', age: 30})
  CREATE (bob:Person {name: 'Bob', age: 25})
  CREATE (alice)-[:KNOWS]->(bob)
  RETURN alice, bob
""")

for row in result['rows']:
    print(row)
```

## 4. Query data

```python
# Simple query
result = branch.query("MATCH (p:Person) WHERE p.age >= 18 RETURN p")
for row in result['rows']:
    print(row)
```

## 5. Commit Changes

```python
# Commit the transaction (creates a snapshot)
branch.commit()
```

## What's Next?

- Understand [Transactions & MVCC](/docs/core/transactions/)
- Learn [GQL Basics](/docs/gql/basics/)
- ORM (à venir)
