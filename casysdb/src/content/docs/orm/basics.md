---
title: ORM Basics
description: Fluent, typed query builder for CasysDB (no GQL required)
head: []
sidebar:
  order: 1
---

This guide introduces CasysDB’s ORM-style fluent API to express graph queries without writing GQL.

## Principles
- **Entities & Relations**: Model nodes and edges in Python/TS types.
- **Fluent API**: Compose `where()`, `select_fields()`, `join_out()` / `join_in()`.
- **Safe defaults**: Readability first, type-friendly.

## Example (Python)
```python
from typing import Self
from casys_db import Database, NodeEntity, HasMany

class Person(NodeEntity):
    knows = HasMany(Self)

# Open DB and start a session
db = Database(":memory:")
session = db.session()

# Find adults
adults = session.Person.where(lambda p: p.age >= 18).select_fields("name", "age").all()

# Join friends (1-hop)
friendships = (
    session.Person
    .where(lambda p: p.name == 'Alice')
    .join_out(lambda p: p.knows)
    .select_map(person=lambda p: p.name, friend=lambda f: f.name)
    .all()
)

# Any/EXISTS with predicate
has_friend_over_30 = (
    session.Person
    .where(lambda p: p.name == 'Alice')
    .any(lambda f: f.age > 30)  # EXISTS subquery
)
```

## Query building blocks
- **`where(predicate)`**: Post-filter on current selection.
- **`select_fields(*names)`**: Pick exact fields.
- **`select_map(**mappings)`**: Remap to explicit keys.
- **`join_out(path)` / `join_in(path)`**: 1-hop joins with flexible depth.
- **`any(predicate)`**: EXISTS subquery with inline predicate.

## When to use ORM
- Application/business code where clarity and safety matter.
- Rapid iteration without remembering GQL syntax.

See also: [Transactions & MVCC →](/core/transactions/)
