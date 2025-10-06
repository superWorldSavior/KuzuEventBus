# Casys Python SDK

Python bindings for **Casys** - An embedded graph database with ISO GQL support.

## Features

- **Embedded**: Runs in-process, no separate server needed
- **ISO GQL**: Query with standardized Graph Query Language
- **Transactional**: ACID guarantees with branches and snapshots
- **Persistent**: Data stored in segments + WAL for durability
- **Fast**: Direct Rust bindings via pyo3, zero-copy where possible

## Installation

```bash
pip install casys_db
```

Or build from source:

```bash
cd python
pip install maturin
maturin develop  # Development build
maturin build --release  # Production wheel
```

## Quick Start

```python
import casys_db

# Initialize engine
engine = casys_db.CasysEngine(data_dir="~/.casys_db")

# Open database and branch
db = engine.open_database("social")
engine.create_branch("social", "main")
branch = engine.open_branch("social", "main")

# Execute query
result = branch.query("MATCH (n:Person) WHERE n.age > 25 RETURN n.name, n.age ORDER BY n.age DESC LIMIT 10")

print(f"Columns: {result['columns']}")
for row in result['rows']:
    print(row)

# Persist data
branch.flush()  # Write to disk
branch.load()   # Load from disk
```

## API Reference

### Engine

```python
engine = casys_db.CasysEngine(data_dir: str)
```

- `open_database(name: str) -> str`: Open or create a database
- `create_branch(db_name: str, branch_name: str)`: Create a new branch
- `open_branch(db_name: str, branch_name: str) -> CasysBranch`: Open a branch

### Branch

```python
branch = engine.open_branch("mydb", "main")
```

- `query(gql: str) -> dict`: Execute an ISO GQL query
  - Returns: `{"columns": [...], "rows": [[...], ...]}`
- `flush()`: Persist in-memory data to disk (segments)
- `load()`: Load data from disk into memory

## Supported ISO GQL Features

- **MATCH**: Node and edge patterns with labels and properties
- **WHERE**: Filtering with boolean expressions
- **RETURN**: Projection with aliases
- **ORDER BY**: Sorting (ASC/DESC)
- **LIMIT**: Result limiting
- **Aggregates**: COUNT, SUM, AVG, MIN, MAX with GROUP BY

Example:
```python
result = branch.query("""
    MATCH (a:Person)-[r:KNOWS]->(b:Person)
    WHERE a.age > 20 AND b.city = 'Paris'
    RETURN a.name, COUNT(b) AS friend_count
    ORDER BY friend_count DESC
    LIMIT 5
""")
```

## ORM (Coming Soon)

Entity Framework-style ORM for Python:

```python
from casys_db import NodeEntity, HasMany, HasOne

class Person(NodeEntity):
    labels = ["Person"]
    name: str
    age: int
    friends = HasMany("Person", via="KNOWS")
    city = HasOne("City", via="LIVES_IN")

# Query with navigation
older_friends = (session.query(Person)
    .where(lambda p: p.age > 20 and p.city.name == "Paris")
    .order_by_desc(lambda p: p.age)
    .take(5)
    .all())
```

## Architecture

- **Rust Core**: High-performance engine with SW-MR concurrency
- **pyo3 Bindings**: Zero-overhead Python ↔ Rust communication
- **Storage**: Segments (nodes/edges) + WAL for durability
- **Branches**: Copy-on-write branching for isolation

## License

MIT OR Apache-2.0
