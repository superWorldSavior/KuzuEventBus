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

### Variable-Length Paths (ISO GQL `*min..max`)

Casys supports bounded multi-hop traversals:

- `*`       → 1 to ∞ hops
- `*n`      → exactly n hops
- `*n..m`   → n to m hops
- `*..m`    → 0 to m hops (includes starting node)
- `*n..`    → n to ∞ hops

Examples:

```python
res1 = branch.query("MATCH (a:Person)-[:KNOWS*2]->(p:Person) WHERE a.name = 'Alice' RETURN p.name")
res2 = branch.query("MATCH (a:Person)-[:KNOWS*1..3]->(p:Person) WHERE a.name = 'Alice' RETURN p.name")
res3 = branch.query("MATCH (a:Person)-[:KNOWS*..2]->(p:Person) WHERE a.name = 'Alice' RETURN p.name")
```

## ORM (Coming Soon)

Entity Framework-style ORM for Python:
### ORM: Variable-Length Traversals via `depth()`

Use `depth()` on relationships to control traversal length:

```python
class Person(NodeEntity):
    labels = ["Person"]
    # direct friends (1 hop)
    friends = HasMany("Person", via="KNOWS")
    # friends of friends (exactly 2 hops)
    friends_of_friends = HasMany("Person", via="KNOWS").depth(2)
    # extended network (1..3 hops)
    network = HasMany("Person", via="KNOWS").depth(1, 3)
    # up to 3 hops
    up_to_three = HasMany("Person", via="KNOWS").depth(max=3)
    # at least 2 hops
    two_or_more = HasMany("Person", via="KNOWS").depth(min=2)
    # include starting node (0..2)
    include_start = HasMany("Person", via="KNOWS").depth(0, 2)
```

Semantics:

- `depth(n)` → `*n`
- `depth(n, m)` → `*n..m`
- `depth(max=m)` → `*1..m`
- `depth(min=n)` → `*n..`
- `depth()` → `*`
- `depth(0, m)` → `*0..m`

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
