---
title: Bases de l'ORM
description: Query builder fluent sans GQL
head: []
sidebar:
  order: 1
---

Cette page présente l’API fluente de style ORM de CasysDB pour écrire des requêtes graphe **sans** GQL.

## Principes
- **Entités & Relations**: Modélisez nœuds et arêtes en types Python/TS.
- **API fluente**: Composez `where()`, `select_fields()`, `join_out()` / `join_in()`.
- **Sécurité**: Lisibilité et compatibilité types en priorité.

## Exemple (Python)
```python
from typing import Self
from casys_db import Database, NodeEntity, HasMany

class Person(NodeEntity):
    knows = HasMany(Self)

# Ouvrir la base et démarrer une session
db = Database(":memory:")
session = db.session()

# Adultes
adults = session.Person.where(lambda p: p.age >= 18).select_fields("name", "age").all()

# Joindre les amis (1-hop)
friendships = (
    session.Person
    .where(lambda p: p.name == 'Alice')
    .join_out(lambda p: p.knows)
    .select_map(person=lambda p: p.name, friend=lambda f: f.name)
    .all()
)

# Any/EXISTS avec prédicat
has_friend_over_30 = (
    session.Person
    .where(lambda p: p.name == 'Alice')
    .any(lambda f: f.age > 30)
)
```

## Briques de base
- **`where(predicate)`**: Filtre post-sélection.
- **`select_fields(*noms)`**: Sélectionne des champs précis.
- **`select_map(**mappings)`**: Remappe vers des clés explicites.
- **`join_out(path)` / `join_in(path)`**: Jointures 1-hop avec profondeur flexible.
- **`any(predicate)`**: Sous-requête EXISTS avec prédicat inline.

## Quand utiliser l’ORM ?
- Code applicatif où clarté et sécurité comptent.
- Itérations rapides sans mémoriser la syntaxe GQL.

Voir aussi : [Transactions & MVCC →](/fr/core/transactions/)
