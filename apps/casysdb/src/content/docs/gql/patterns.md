---
title: Query Patterns
description: Common ISO GQL patterns for graph queries
sidebar:
  order: 2
---

This guide covers common query patterns in ISO GQL for CasysDB.

## Pattern Matching

### Simple Path
```gql
MATCH (person:Person)-[:KNOWS]->(friend:Person)
WHERE person.name = 'Alice'
RETURN friend.name
```

### Variable-Length Paths
```gql
MATCH (person:Person)-[:KNOWS*1..3]->(friend:Person)
WHERE person.name = 'Alice'
RETURN DISTINCT friend.name, friend.age
ORDER BY friend.age DESC
```

### Multiple Patterns
```gql
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
MATCH (friend)-[:WORKS_AT]->(company:Company)
RETURN friend.name, company.name
```

## Filtering

### Property Filters
```gql
MATCH (p:Person)
WHERE p.age > 25 AND p.city = 'Paris'
RETURN p.name, p.age
```

### Relationship Filters
```gql
MATCH (p:Person)-[r:KNOWS]->(friend:Person)
WHERE r.since > 2020
RETURN p.name, friend.name, r.since
```

### EXISTS Subqueries
```gql
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:KNOWS]->(friend:Person)
  WHERE friend.age > 30
}
RETURN p.name
```

## Aggregation

### Count & Group
```gql
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN c.name, COUNT(p) AS employee_count
ORDER BY employee_count DESC
```

### Statistical Functions
```gql
MATCH (p:Person)
RETURN 
  AVG(p.age) AS avg_age,
  MIN(p.age) AS min_age,
  MAX(p.age) AS max_age,
  SUM(p.salary) AS total_salary
```

## Data Modification

### Create Nodes
```gql
CREATE (p:Person {
  name: 'Bob',
  age: 35,
  city: 'Lyon'
})
RETURN p
```

### Create Relationships
```gql
MATCH (alice:Person {name: 'Alice'})
MATCH (bob:Person {name: 'Bob'})
CREATE (alice)-[r:KNOWS {since: 2024}]->(bob)
RETURN r
```

### Update Properties
```gql
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.city = 'Paris'
RETURN p
```

### Delete
```gql
MATCH (p:Person {name: 'Bob'})
DELETE p
```

## Advanced Patterns

### Shortest Path
```gql
MATCH path = SHORTEST (alice:Person {name: 'Alice'})-[:KNOWS*]-(bob:Person {name: 'Bob'})
RETURN path
```

### Optional Match
```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name
```

### WITH Clause (Pipeline)
```gql
MATCH (p:Person)
WITH p, p.age * 12 AS monthly_age
WHERE monthly_age > 360
RETURN p.name, monthly_age
```

## Performance Tips

- **Use indexes**: Create indexes on frequently queried properties
- **Limit early**: Apply `WHERE` filters before expensive operations
- **Avoid cartesian products**: Always connect patterns with relationships
- **Use DISTINCT wisely**: Only when necessary, as it adds overhead

## Next Steps

- [Basics](/gql/basics/) - ISO GQL fundamentals
- [Python ORM](/sdk/python/orm/) - Type-safe queries in Python
