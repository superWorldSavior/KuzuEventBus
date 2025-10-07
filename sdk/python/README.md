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

### Simple API (Recommended)

```python
from casys_db import Database

# Open or create database
db = Database("social.db")

# Execute query
result = db.query("MATCH (n:Person) WHERE n.age > 25 RETURN n.name, n.age ORDER BY n.age DESC LIMIT 10")

print(f"Columns: {result['columns']}")
for row in result['rows']:
    print(row)

# Persist changes
db.commit()
```

### Low-level API (Advanced)

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

### High-Level API

#### Database

```python
from casys_db import Database

db = Database(path: str, data_dir: Optional[str] = None)
```

- `query(gql: str, params: Optional[Dict] = None) -> dict`: Execute ISO GQL query
- `commit()`: Persist changes to disk
- `create_branch(name: str) -> Branch`: Create new branch
- `branch(name: str) -> Branch`: Switch to existing branch
- `branch_at(name: str, timestamp: str) -> Branch`: Create branch from point in time (PITR)
- `history(from_time: Optional[str] = None) -> List[dict]`: View database history
- `snapshots() -> List[dict]`: List all snapshots

#### Branch

```python
branch = db.branch("experiment")
```

- `query(gql: str, params: Optional[Dict] = None) -> dict`: Execute query on branch
- `commit()`: Persist changes
- `load()`: Load data from disk
- `name: str`: Branch name property

### Low-Level API (Advanced)

#### Engine

```python
engine = casys_db.CasysEngine(data_dir: str)
```

- `open_database(name: str) -> str`: Open or create a database
- `create_branch(db_name: str, branch_name: str)`: Create a new branch
- `open_branch(db_name: str, branch_name: str) -> CasysBranch`: Open a branch

#### CasysBranch

```python
branch = engine.open_branch("mydb", "main")
```

- `query(gql: str) -> dict`: Execute an ISO GQL query
- `flush()`: Persist in-memory data to disk (segments)
- `load()`: Load data from disk into memory

## Supported GQL Features

- **MATCH**: Node/edge patterns with labels and properties
- **WHERE**: Filtering with comparisons, `IS NULL`, `AND`/`OR`
- **WITH**: Pipeline transformations
- **EXISTS**: Correlated subqueries
- **RETURN**: Projections with aliases
- **ORDER BY**: Sorting (ASC/DESC)
- **LIMIT**: Result limiting
- **Variable-length paths**: `*min..max` syntax
- **Named parameters**: `$variable` binding

```python
# Variable-length paths
result = branch.query(
    "MATCH (a:Person)-[:KNOWS*1..3]->(p) WHERE a.name = $name RETURN p.name",
    {"name": "Alice"}
)

# WITH clause pipeline
result = branch.query("""
    MATCH (p:Person)-[:LIVES_IN]->(c:City)
    WITH p.name AS person, c.name AS city
    WHERE city = 'Paris'
    RETURN person, city
""")
```

## ORM

LINQ-style fluent API with lambda expressions:

```python
from casys_db import Session, NodeEntity, HasMany, HasOne
from typing import Self

class City(NodeEntity):
    pass  # Label implicite: "City"

class Person(NodeEntity):
    lives_in = HasOne(City)              # via auto: LIVES_IN
    friends = HasMany(Self)              # Self-ref avec typing.Self

session = Session(branch)

# Fluent queries with lambdas
adults = session.Person.where(lambda p: p.age >= 18).all()

# Joins + projections
results = (session.Person
    .join_out(lambda p: p.lives_in)
    .select(name=lambda p: p.name, city=lambda c: c.name)
    .all())
```

**📚 Complete ORM reference**: See [`examples/orm_cheatsheet.md`](examples/orm_cheatsheet.md) for:
- Variable-length traversals with `depth()`
- Advanced projections and aggregations
- Relationship patterns
- Query optimization tips

## Architecture

- **Rust Core**: High-performance engine with SW-MR concurrency
- **pyo3 Bindings**: Zero-overhead Python ↔ Rust communication
- **Storage**: Segments (nodes/edges) + WAL for durability
- **Branches**: Copy-on-write branching for isolation

## Tests

Le SDK inclut une suite de tests complète:

```bash
# Installer les dépendances de dev
pip install -e ".[dev]"

# Exécuter tous les tests
./run_tests.sh

# Avec couverture
./run_tests.sh --cov

# Rebuild + tests
./run_tests.sh --rebuild
```

Voir `tests/README.md` pour plus de détails.

## License

MIT OR Apache-2.0
