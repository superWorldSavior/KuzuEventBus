---
title: GQL Basics
description: Introduction to ISO GQL graph query language
head: []
---

CasysDB implements **ISO GQL** (Graph Query Language), the international standard for querying graph databases.

## Basic Structure

A typical GQL query follows this pattern:

```gql
MATCH <pattern>
WHERE <conditions>
RETURN <expressions>
```

## Creating Nodes

### Simple Node

```gql
CREATE (p:Person {name: 'Alice', age: 30})
RETURN p
```

### Multiple Nodes

```gql
CREATE (alice:Person {name: 'Alice', age: 30})
CREATE (bob:Person {name: 'Bob', age: 25})
RETURN alice, bob
```

## Creating Relationships

```gql
MATCH (alice:Person {name: 'Alice'})
MATCH (bob:Person {name: 'Bob'})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
```

## Pattern Matching

### Simple Match

```gql
MATCH (p:Person)
WHERE p.age >= 18
RETURN p.name, p.age
```

### Relationship Match

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name AS person, b.name AS friend
```

### Variable-Length Paths

```gql
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
WHERE a.name = 'Alice'
RETURN b.name AS reachable_friends
```

## WHERE Clause

### Comparison Operators

```gql
MATCH (p:Person)
WHERE p.age > 25 AND p.age < 40
RETURN p
```

### Pattern Predicates

```gql
MATCH (p:Person)
WHERE (p)-[:WORKS_AT]->(:Company {name: 'TechCorp'})
RETURN p.name
```

### NULL Checks

```gql
MATCH (p:Person)
WHERE p.email IS NOT NULL
RETURN p
```

## RETURN Clause

### Aliases

```gql
MATCH (p:Person)
RETURN p.name AS full_name, p.age AS years_old
```

### Expressions

```gql
MATCH (p:Person)
RETURN p.name, p.age, p.age + 10 AS age_in_ten_years
```

### Aggregations

```gql
MATCH (p:Person)
RETURN COUNT(p) AS total_people, AVG(p.age) AS average_age
```

## Advanced Features

### WITH Clause (Pipelines)

```gql
MATCH (p:Person)
WITH p, p.age * 2 AS double_age
WHERE double_age > 50
RETURN p.name, double_age
```

### EXISTS Subqueries

```gql
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:KNOWS]->(:Person {name: 'Alice'})
}
RETURN p.name
```

### ORDER BY

```gql
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10
```

## Next Steps

- [Transactions](/gql/transactions/) - Learn about MVCC and isolation
- [Advanced Patterns](/gql/patterns/) - Complex graph patterns
- [Functions](/gql/functions/) - Built-in GQL functions
