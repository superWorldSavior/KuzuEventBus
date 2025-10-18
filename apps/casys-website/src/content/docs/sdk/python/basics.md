---
title: Python SDK - Basics
description: Getting started with CasysDB Python SDK
head: []
sidebar:
  order: 1
---

Le SDK Python de CasysDB fournit des bindings natifs via PyO3 et une API fluente pour interagir avec votre base de données graphe.

## Installation

```bash
pip install casys-db
```

## Quick Start

```python
from casys_db import Database

# Ouvrir ou créer une base
db = Database("mydb.db")

# Accéder à la branche par défaut
branch = db.default_branch()

# Exécuter une requête GQL
result = branch.query("""
  CREATE (p:Person {name: 'Alice', age: 30})
  RETURN p
""")

print(result)
```

## API Database

### Ouvrir une base

```python
from casys_db import Database

# Créer/ouvrir une base locale
db = Database("path/to/mydb.db")

# La base est créée si elle n'existe pas
```

### Gérer les branches

```python
# Branche par défaut (main)
main = db.default_branch()

# Créer une nouvelle branche
experiment = db.create_branch("experiment")

# Lister les branches
branches = db.list_branches()
for branch in branches:
    print(f"{branch.name}: {branch.latest_snapshot}")

# Accéder à une branche existante
feature = db.branch("feature-xyz")
```

### Snapshots & PITR

```python
# Lister les snapshots
snapshots = db.snapshots(branch="main")
for snap in snapshots:
    print(f"Snapshot @ {snap.timestamp}: {snap.segments_count} segments")

# Créer une branche depuis un point passé
recovery = db.branch_at(
    name="recovery",
    timestamp="2025-01-06T10:00:00Z"
)
```

## API Branch

### Exécuter des requêtes

```python
branch = db.default_branch()

# Requête simple
result = branch.query("MATCH (p:Person) RETURN p")

# Avec paramètres
result = branch.query(
    "MATCH (p:Person) WHERE p.age > $minAge RETURN p",
    params={"minAge": 18}
)

# Accéder aux résultats
for row in result['rows']:
    print(row)
```

### Transactions

```python
# Transaction explicite
tx = branch.begin_transaction()

try:
    tx.query("CREATE (p:Person {name: 'Bob'})")
    tx.query("CREATE (c:City {name: 'Paris'})")
    tx.commit()  # Atomique
except Exception as e:
    tx.rollback()
    raise
```

### Commit

```python
# Créer un snapshot
branch.query("CREATE (p:Person {name: 'Charlie'})")
branch.commit()  # Force la création d'un snapshot
```

## Format de résultats

Les résultats sont retournés sous forme de dictionnaire :

```python
result = branch.query("MATCH (p:Person) RETURN p.name, p.age")

# Structure du résultat
{
  "columns": ["p.name", "p.age"],
  "rows": [
    ["Alice", 30],
    ["Bob", 25]
  ]
}

# Accès aux données
for row in result['rows']:
    name, age = row
    print(f"{name} is {age} years old")
```

## Session & ORM (aperçu — WIP)

> Note: l'ORM est en cours de développement. L'API est susceptible d'évoluer et n'est pas encore stabilisée.

Pour une API plus fluente, utilisez l'ORM :

```python
from casys_db import Session, NodeEntity

class Person(NodeEntity):
    name: str
    age: int

# Créer une session
branch = db.default_branch()
session = Session(branch)

# Query builder
adults = session.Person.where(lambda p: p.age >= 18).all()
```

Voir [ORM Documentation →](/sdk/python/orm/) pour plus de détails.

## Gestion d'erreurs

```python
from casys_db import CasysError

try:
    branch.query("INVALID GQL SYNTAX")
except CasysError as e:
    print(f"Query error: {e}")
```

### Types d'erreurs

- `ParseError` : Syntaxe GQL invalide
- `ExecutionError` : Erreur d'exécution (nœud introuvable, etc.)
- `TransactionError` : Conflit de transaction

## Performance Tips

### Batch inserts

```python
# ❌ Lent (N commits)
for i in range(1000):
    branch.query(f"CREATE (p:Person {{name: 'User{i}'}})")

# ✅ Rapide (1 commit)
tx = branch.begin_transaction()
for i in range(1000):
    tx.query(f"CREATE (p:Person {{name: 'User{i}'}})")
tx.commit()
```

### Paramètres nommés

```python
# ❌ Parsing à chaque fois
for age in [18, 25, 30]:
    branch.query(f"MATCH (p:Person) WHERE p.age = {age} RETURN p")

# ✅ Parsing une seule fois
for age in [18, 25, 30]:
    branch.query(
        "MATCH (p:Person) WHERE p.age = $age RETURN p",
        params={"age": age}
    )
```

## Exemples complets

### Application Flask

```python
from flask import Flask
from casys_db import Database

app = Flask(__name__)
db = Database("app.db")

@app.route('/users')
def get_users():
    branch = db.default_branch()
    result = branch.query("MATCH (u:User) RETURN u")
    return {"users": result['rows']}

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    branch = db.default_branch()
    branch.query(
        "CREATE (u:User {name: $name, email: $email})",
        params=data
    )
    branch.commit()
    return {"status": "created"}
```

### ML Pipeline

```python
from casys_db import Database
import numpy as np

db = Database("embeddings.db")
main = db.default_branch()

# Insérer des embeddings
def store_embedding(doc_id, text, embedding):
    main.query("""
      CREATE (d:Document {
        id: $id,
        text: $text,
        embedding: $emb
      })
    """, {
        "id": doc_id,
        "text": text,
        "emb": embedding.tolist()
    })

# Recherche vectorielle (brute force)
def search(query_embedding, top_k=5):
    docs = main.query("MATCH (d:Document) RETURN d")
    
    # Calculer similarités
    scores = []
    for row in docs['rows']:
        doc_emb = np.array(row[0]['embedding'])
        score = np.dot(query_embedding, doc_emb)
        scores.append((score, row[0]))
    
    # Top-K
    scores.sort(reverse=True)
    return scores[:top_k]
```

## Prochaines étapes

- [ORM Documentation →](/docs/sdk/python/orm/)
- [GQL Basics →](/docs/gql/basics/)
- [Transactions →](/docs/core/transactions/)
