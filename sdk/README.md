# Casys SDKs

Multi-language SDKs for **Casys** - the embedded graph database with ISO GQL support.

## Structure

```
sdk/
├── python/          # Python SDK (pyo3 bindings)
│   ├── src/         # Rust bindings code
│   ├── examples/    # Python examples
│   └── README.md    # Python-specific documentation
└── typescript/      # TypeScript SDK (future, via napi-rs or WASM)
    └── ...
```

## Available SDKs

### Python (Current)
**Status**: ✅ In development
**Technology**: pyo3 + maturin
**Installation**:
```bash
cd sdk/python
pip install maturin
maturin develop  # Development mode
```

**Quick start**:
```python
from casys_python import CasysEngine

engine = CasysEngine("~/.casys")
db = engine.open_database("mydb")
engine.create_branch("mydb", "main")
branch = engine.open_branch("mydb", "main")

result = branch.query("MATCH (n:Person) RETURN n LIMIT 10")
print(result)
```

See [`python/README.md`](python/README.md) for full documentation.

### TypeScript (Planned)
**Status**: 🚧 Not started
**Technology**: napi-rs (Node.js) or wasm-bindgen (Browser)
**Target API**:
```typescript
import { CasysEngine } from 'casys_db';

const engine = new CasysEngine('~/.casys_db');
const db = engine.openDatabase('mydb');
const branch = engine.openBranch('mydb', 'main');

const result = await branch.query('MATCH (n:Person) RETURN n LIMIT 10');
console.log(result);
```

## SDK Architecture

All SDKs share the same **Rust core** (`../engine`) which provides:
- **Storage**: Segments + WAL for persistence
- **Query Engine**: ISO GQL parser, planner, executor
- **Index**: In-memory graph store with label and adjacency indexes
- **Transactions**: Branches, snapshots, SW-MR concurrency

Each SDK provides:
1. **Low-level bindings**: Direct access to engine operations
2. **High-level API**: Idiomatic wrapper for the target language
3. **ORM (future)**: Entity Framework-style object-relational mapping

## Building & Testing

### Python SDK
```bash
cd sdk/python

# Development build
maturin develop

# Run examples
python examples/basic_query.py

# Production wheel
maturin build --release

# Install locally
pip install target/wheels/casys_db-*.whl
```

### Tests
```bash
# Rust tests (engine)
cd ../engine
cargo test

# Python integration tests (future)
cd sdk/python
pytest tests/
```

## ORM Roadmap (All SDKs)

The goal is to provide an **Entity Framework-style ORM** for all languages:

**Python example**:
```python
from casys_db import NodeEntity, HasMany, HasOne

class Person(NodeEntity):
    labels = ["Person"]
    name: str
    age: int
    friends = HasMany("Person", via="KNOWS")
    city = HasOne("City", via="LIVES_IN")

# Queries with navigation
older_friends = (session.query(Person)
    .where(lambda p: p.age > 20 and p.city.name == "Paris")
    .include("friends")  # Eager load
    .depth(min=1, max=2)  # Traversal depth
    .order_by_desc(lambda p: p.age)
    .take(5)
    .all())
```

**TypeScript example** (future):
```typescript
@NodeEntity({ labels: ['Person'] })
class Person {
  name: string;
  age: number;
  
  @HasMany(() => Person, { via: 'KNOWS' })
  friends: Person[];
  
  @HasOne(() => City, { via: 'LIVES_IN' })
  city: City;
}

// Queries
const olderFriends = await session.query(Person)
  .where(p => p.age > 20 && p.city.name === 'Paris')
  .include('friends')
  .depth({ min: 1, max: 2 })
  .orderByDesc(p => p.age)
  .take(5)
  .toArray();
```

## Contributing

To add a new language SDK:
1. Create a new directory under `sdk/[language]`
2. Set up bindings to the Rust core (`../engine`)
3. Implement the core API: Engine, Database, Branch, query execution
4. Add examples and tests
5. Document in a language-specific README

## License

MIT OR Apache-2.0 (same as core engine)
