---
title: Bases de GQL
description: Introduction au langage de requête graphe ISO GQL
head: []
---

CasysDB implémente **ISO GQL** (Graph Query Language), le standard international pour interroger les bases de données graphe.

## Structure de Base

Une requête GQL typique suit ce modèle :

```gql
MATCH <pattern>
WHERE <conditions>
RETURN <expressions>
```

## Créer des Nœuds

### Nœud Simple

```gql
CREATE (p:Person {name: 'Alice', age: 30})
RETURN p
```

### Nœuds Multiples

```gql
CREATE (alice:Person {name: 'Alice', age: 30})
CREATE (bob:Person {name: 'Bob', age: 25})
RETURN alice, bob
```

## Créer des Relations

```gql
MATCH (alice:Person {name: 'Alice'})
MATCH (bob:Person {name: 'Bob'})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
```

## Pattern Matching

### Match Simple

```gql
MATCH (p:Person)
WHERE p.age >= 18
RETURN p.name, p.age
```

### Match de Relations

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name AS personne, b.name AS ami
```

### Chemins de Longueur Variable

```gql
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
WHERE a.name = 'Alice'
RETURN b.name AS amis_accessibles
```

## Clause WHERE

### Opérateurs de Comparaison

```gql
MATCH (p:Person)
WHERE p.age > 25 AND p.age < 40
RETURN p
```

### Prédicats de Pattern

```gql
MATCH (p:Person)
WHERE (p)-[:WORKS_AT]->(:Company {name: 'TechCorp'})
RETURN p.name
```

### Vérifications NULL

```gql
MATCH (p:Person)
WHERE p.email IS NOT NULL
RETURN p
```

## Clause RETURN

### Alias

```gql
MATCH (p:Person)
RETURN p.name AS nom_complet, p.age AS age_en_annees
```

### Expressions

```gql
MATCH (p:Person)
RETURN p.name, p.age, p.age + 10 AS age_dans_dix_ans
```

### Agrégations

```gql
MATCH (p:Person)
RETURN COUNT(p) AS total_personnes, AVG(p.age) AS age_moyen
```

## Fonctionnalités Avancées

### Clause WITH (Pipelines)

```gql
MATCH (p:Person)
WITH p, p.age * 2 AS double_age
WHERE double_age > 50
RETURN p.name, double_age
```

### Sous-requêtes EXISTS

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

## Prochaines Étapes

- [Transactions](/fr/gql/transactions/) - Apprenez MVCC et l'isolation
- [Patterns Avancés](/fr/gql/patterns/) - Patterns graphe complexes
- [Fonctions](/fr/gql/functions/) - Fonctions GQL intégrées
