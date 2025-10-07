---
title: Démarrage Rapide
description: Commencez avec CasysDB en 5 minutes
---

Ce guide vous permettra d'être opérationnel avec CasysDB en moins de 5 minutes.

## 1. Installer CasysDB

```bash
# Python
pip install casys-db

# TypeScript/Node.js
npm install casys-db
```

## 2. Créer Votre Première Base de Données

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
  <TabItem label="Python">
    ```python
    from casys_db import Database, NodeEntity

    # Créer une base de données en mémoire
    db = Database(":memory:")
    
    # Ou persister sur disque
    # db = Database("chemin/vers/mon_graphe.db")
    
    # Obtenir la branche par défaut
    branch = db.default_branch()
    
    # Démarrer une session
    session = branch.session()
    ```
  </TabItem>
  
  <TabItem label="TypeScript">
    ```typescript
    import { Database } from 'casys-db';

    // Créer une base de données en mémoire
    const db = new Database(':memory:');
    
    // Ou persister sur disque
    // const db = new Database('chemin/vers/mon_graphe.db');
    
    // Obtenir la branche par défaut
    const branch = db.defaultBranch();
    
    // Démarrer une session
    const session = branch.session();
    ```
  </TabItem>
</Tabs>

## 3. Créer des Nœuds avec GQL

<Tabs>
  <TabItem label="Python">
    ```python
    # Exécuter du GQL brut
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
    // Exécuter du GQL brut
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

## 4. Requête avec l'API Fluente (ORM Python)

Le SDK Python inclut un query builder fluent :

```python
from typing import Self

class Person(NodeEntity):
    knows = HasMany(Self)

# Requête de tous les adultes
adults = session.Person.where(lambda p: p.age >= 18).all()

# Requête avec jointures
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
    print(f"{row['person_name']} connaît {row['friend_name']}")
```

## 5. Valider les Modifications

<Tabs>
  <TabItem label="Python">
    ```python
    # Valider la transaction
    session.commit()
    
    # Ou annuler
    # session.rollback()
    ```
  </TabItem>
  
  <TabItem label="TypeScript">
    ```typescript
    // Valider la transaction
    session.commit();
    
    // Ou annuler
    // session.rollback();
    ```
  </TabItem>
</Tabs>

## Et Après ?

- Apprenez-en plus sur la [Syntaxe GQL](/fr/gql/basics/)
- Explorez le [SDK Python](/fr/sdk/python/basics/)
- Consultez les [Exemples](/fr/examples/social-network/)
- Comprenez les [Transactions & MVCC](/fr/gql/transactions/)
