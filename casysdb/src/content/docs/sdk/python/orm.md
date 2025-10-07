---
title: Python ORM
description: Type-safe query builder for CasysDB Python SDK
head: []
sidebar:
  order: 2
---

L'ORM Python de CasysDB est un **query builder type-safe** inspiré d'Entity Framework (LINQ) et SQLAlchemy, mais conçu pour les graphes.

## Setup

```python
from casys_db import Database, Session, NodeEntity

db = Database("mydb.db")
branch = db.default_branch()
session = Session(branch)
```

## Définir des entités

### Entities de base

```python
from casys_db import NodeEntity

class Person(NodeEntity):
    name: str
    age: int

class City(NodeEntity):
    name: str
    population: int
```

### Relations

```python
from casys_db import to, from_, both, Relation
from typing import Self

class LivesInRel(Relation):
    since: int
    reason: str

class Person(NodeEntity):
    name: str
    age: int
    
    # Relations typées (zero strings!)
    home = LivesInRel.to(City)        # Outgoing: (Person)-[:LivesInRel]->(City)
    friends = to(Self)                # Outgoing: (Person)-[:FRIENDS]->(Person)
    residents = LivesInRel.from_(City)  # Incoming: (City)-[:LivesInRel]->(Person)
    
    # Relations bidirectionnelles
    knows = both(Self)                # (Person)-[:KNOWS]-(Person)
```

### Union de relations (AnyOf)

```python
from casys_db import AnyOf

class BossRel(Relation):
    title: str
    since: int

class KnowsRel(Relation):
    strength: float

class Person(NodeEntity):
    # Union de plusieurs types de relations
    social = AnyOf(BossRel, KnowsRel).to(Self)  # BossRel|KnowsRel
```

## Query Builder

### WHERE clause

```python
# Filtre simple
adults = session.Person.where(lambda p: p.age >= 18).all()

# Multiples conditions
senior_parisians = session.Person \
    .where(lambda p: p.age > 60) \
    .where(lambda p: p.city == "Paris") \
    .all()
```

### SELECT (projections)

```python
# Projection avec kwargs (recommandé)
rows = session.Person.select(
    name=lambda p: p.name,
    age=lambda p: p.age
).all()

# Projection avec calculs
rows = session.Product.select(
    total=lambda p: p.price + p.tax
).all()
```

### ORDER BY & LIMIT

```python
# Tri descendant
top_users = session.Person \
    .order_by_desc(lambda p: p.age) \
    .limit(10) \
    .all()

# Tri multiple
session.Person \
    .order_by(lambda p: p.city) \
    .order_by_desc(lambda p: p.age) \
    .all()
```

### COUNT

```python
adult_count = session.Person.where(lambda p: p.age >= 18).count()
```

## Navigation de relations

### Propriétés de relation (lazy)

```python
alice = session.Person.where(lambda p: p.name == "Alice").first()

# Navigation lazy (retourne List[Person])
for friend in alice.friends:
    print(friend.name)
```

### with_relations() - Accès aux propriétés d'arête

```python
# Retourne des paires (relation, node)
for rel, boss in me.with_relations(Person.boss):
    print(boss.name, rel.title, rel.since)

# Multi-relations
for rel, person in me.with_relations(Person.boss, Person.friends):
    if isinstance(rel, BossRel):
        print("Boss:", person.name, rel.title)
    elif isinstance(rel, KnowsRel):
        print("Ami:", person.name, rel.strength)

# Union (AnyOf)
for rel, person in me.with_relations(Person.social):
    print(type(rel).__name__, "→", person.name)  # BossRel ou KnowsRel
```

## EXISTS (any)

### any() sans prédicat

```python
# Articles qui ont au moins un tag
articles = session.Article.where(lambda a: a.tags.any()).all()

# Articles sans tags
no_tags = session.Article.where(lambda a: not a.tags.any()).all()
```

### any() avec prédicat

```python
# Articles avec un tag "Tech"
tech_articles = session.Article.where(
    lambda a: a.tags.any(lambda t: t.name == "Tech")
).all()
```

## Profondeur variable

```python
class Person(NodeEntity):
    # Profondeur 1..3
    network = to(Self).depth(1, 3)  # MATCH (p)-[:NETWORK*1..3]->(friend)

# Utilisation
alice = session.Person.where(lambda p: p.name == "Alice").first()
for friend in alice.network:
    print(friend.name)  # Amis à 1, 2, ou 3 hops
```

## Création et mise à jour

### Créer des nœuds

```python
alice = Person(name="Alice", age=30)
session.save(alice)  # Crée (p:Person {name: "Alice", age: 30})
```

### Requêtes brutes

```python
# GQL direct
result = session.execute_raw("""
  MATCH (p:Person)-[:KNOWS*2..3]->(friend)
  WHERE p.name = $name
  RETURN friend.name, friend.age
""", {"name": "Alice"})

# Scalaire
max_age = session.execute_scalar("""
  MATCH (p:Person)
  RETURN MAX(p.age)
""")
```

## Paramètres nommés

```python
# Passer des params
results = session.Person \
    .where(lambda p: p.age > 0) \  # GQL peut contenir $minAge
    .params({"minAge": 25}) \
    .all()
```

## Exemples complets

### RAG avec Knowledge Graph

```python
from casys_db import Database, NodeEntity, to

class Document(NodeEntity):
    title: str
    content: str
    embedding: list[float]

class Topic(NodeEntity):
    name: str

class Document(NodeEntity):
    # ...
    topics = to(Topic)  # (Document)-[:TOPICS]->(Topic)

# Setup
db = Database("knowledge_graph.db")
session = Session(db.default_branch())

# Créer documents avec embeddings
session.execute_raw("""
  CREATE (d:Document {
    title: 'RAG with CasysDB',
    content: 'Complete guide...',
    embedding: [0.23, -0.45, 0.67, ...]
  })
  CREATE (ai:Topic {name: 'AI'})
  CREATE (db:Topic {name: 'Databases'})
  CREATE (d)-[:TOPICS]->(ai)
  CREATE (d)-[:TOPICS]->(db)
""")

# Query avec ORM
ai_docs = session.Document.where(
    lambda d: d.topics.any(lambda t: t.name == "AI")
).all()

for doc in ai_docs:
    print(doc.title)
```

### Réseau social

```python
class Person(NodeEntity):
    name: str
    friends = to(Self).depth(1, 3)  # Amis à 1-3 hops

# Trouver amis d'amis
alice = session.Person.where(lambda p: p.name == "Alice").first()
network = alice.friends  # Liste[Person] à 1-3 hops

# Requête plus complexe
mutual_friends = session.execute_raw("""
  MATCH (a:Person)-[:FRIENDS]->(mutual)<-[:FRIENDS]-(b:Person)
  WHERE a.name = $alice AND b.name = $bob
  RETURN mutual.name
""", {"alice": "Alice", "bob": "Bob"})
```

## Prochaines étapes

- [GQL Basics →](/gql/basics/)
- [Architecture →](/core/architecture/)
- [Transactions →](/core/transactions/)
