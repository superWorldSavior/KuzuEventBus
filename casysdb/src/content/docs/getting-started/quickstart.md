---
title: Quick Start
description: Get started with CasysDB in 5 minutes
---

This guide will get you up and running with CasysDB in less than 5 minutes.

## 1. Install CasysDB

```bash
# Python
pip install casys-db

# TypeScript/Node.js
npm install casys-db
```

## 2. Create Your First Database

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
  <TabItem label="Python">
    ```python
    from casys_db import Database, NodeEntity

    # Create an in-memory database
    db = Database(":memory:")
    
    # Or persist to disk
    # db = Database("path/to/my_graph.db")
    
    # Get the default branch
    branch = db.default_branch()
    
    # Start a session
    session = branch.session()
    ```
  </TabItem>
  
  <TabItem label="TypeScript">
    ```typescript
    import { Database } from 'casys-db';

    // Create an in-memory database
    const db = new Database(':memory:');
    
    // Or persist to disk
    // const db = new Database('path/to/my_graph.db');
    
    // Get the default branch
    const branch = db.defaultBranch();
    
    // Start a session
    const session = branch.session();
    ```
  </TabItem>
</Tabs>

## 3. Create Nodes with GQL

<Tabs>
  <TabItem label="Python">
    ```python
    # Execute raw GQL
    result = session.execute("""
      CREATE (alice:Person {name: 'Alice', age: 30})
      CREATE (bob:Person {name: 'Bob', age: 25})
      CREATE (alice)-[:KNOWS]->(bob)
      RETURN alice, bob
    """)
    
    for row in result:
        print(row)
    ```
  </TabItem>
  
  <TabItem label="TypeScript">
    ```typescript
    // Execute raw GQL
    const result = session.execute(`
      CREATE (alice:Person {name: 'Alice', age: 30})
      CREATE (bob:Person {name: 'Bob', age: 25})
      CREATE (alice)-[:KNOWS]->(bob)
      RETURN alice, bob
    `);
    
    for (const row of result) {
      console.log(row);
    }
    ```
  </TabItem>
</Tabs>

## 4. Query with Fluent API (Python ORM)

Python SDK includes a fluent query builder:

```python
from typing import Self

class Person(NodeEntity):
    knows = HasMany(Self)

# Query all adults
adults = session.Person.where(lambda p: p.age >= 18).all()

# Query with joins
results = (
    session.Person
    .where(lambda p: p.name == 'Alice')
    .join_out(lambda p: p.knows)
    .select(
        person_name=lambda p: p.name,
        friend_name=lambda f: f.name
    )
    .all()
)

for row in results:
    print(f"{row['person_name']} knows {row['friend_name']}")
```

## 5. Commit Changes

<Tabs>
  <TabItem label="Python">
    ```python
    # Commit the transaction
    session.commit()
    
    # Or rollback
    # session.rollback()
    ```
  </TabItem>
  
  <TabItem label="TypeScript">
    ```typescript
    // Commit the transaction
    session.commit();
    
    // Or rollback
    // session.rollback();
    ```
  </TabItem>
</Tabs>

## What's Next?

- Learn more about [GQL Syntax](/gql/basics/)
- Explore the [Python SDK](/sdk/python/basics/)
- Check out [Examples](/examples/social-network/)
- Understand [Transactions & MVCC](/gql/transactions/)
