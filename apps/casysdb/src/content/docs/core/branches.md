---
title: Branches & Time Travel
description: Git-like branches and Point-in-Time Recovery
head: []
sidebar:
  order: 3
---

CasysDB implémente des **branches Git-like** et le **Point-in-Time Recovery (PITR)** pour voyager dans l'historique de votre base de données.

:::tip[Par défaut]
Vous pouvez **commencer à travailler sans créer de branche**. Une **branche par défaut** (par convention `main`) est implicite et utilisée lorsque vous appelez `db.query(...)`.
Créez des branches uniquement quand vous en avez besoin (expérimentations parallèles, PITR, comparaisons, etc.).
:::

## Concepts

### Branches

Comme Git, chaque branche est une **ligne de développement indépendante** :

```python
from casys_db import Database

db = Database("knowledge_graph.db")

# Travailler directement sur la branche par défaut ("main")
db.query("CREATE (p:Person {name: 'Alice'})")

# Quand nécessaire: créer une branche expérimentale
experiment = db.create_branch("test-llama3", from_branch="main")
```

### Snapshots

Chaque **commit** crée un snapshot immuable :

```
main:
  snapshot_001 (t=0)
  ├─ snapshot_002 (t=1)
  │  └─ snapshot_003 (t=2)  ← HEAD
  │
  └─ [branch experiment @ t=1]
     └─ snapshot_004 (t=3)  ← experiment HEAD
```

## API Branches

### Créer une branche

```python
# Depuis HEAD de main
experiment = db.create_branch("experiment")

# Depuis une branche spécifique
feature = db.create_branch("feature", from_branch="experiment")

# Depuis un snapshot passé (PITR)
recovery = db.create_branch_at("recovery", timestamp="2 hours ago")
```

### Lister les branches

```python
branches = db.list_branches()
for branch in branches:
    print(f"{branch.name}: {branch.latest_snapshot}")
```

### Travailler sur une branche spécifique (optionnel)

```python
# Récupérer une branche nommée et opérer dessus
experiment = db.branch("experiment")
experiment.query("CREATE (p:Person {name: 'Bob'})")

# La branche par défaut ("main") reste accessible sans appel explicite
db.query("CREATE (p:Person {name: 'Alice'})")

# Les écritures sont isolées par branche
```

## Point-in-Time Recovery (PITR)

### Voyage dans le temps

```python
# Voir l'historique
snapshots = db.snapshots(branch="main")
for snap in snapshots:
    print(f"{snap.timestamp}: {snap.segments_count} segments")

# Créer une branche depuis un point passé
recovery = db.branch_at(
    name="safe-state",
    timestamp="2025-01-06T10:00:00Z"
)

# Vérifier l'état
count = recovery.query("MATCH (p:Person) RETURN count(p)")
print(f"Persons @ safe-state: {count}")
```

### Cas d'usage PITR

#### 1. Rollback après erreur
```python
# Production cassée @ 14:30
# Créer une branche depuis 14:00 (avant l'erreur)
rollback = db.branch_at("rollback-14h", timestamp="14:00")

# Vérifier que les données sont OK
rollback.query("MATCH (p:Person) RETURN count(p)")

# Promouvoir rollback en main si OK
```

#### 2. Test de migrations
```python
# Tester une migration sur une branche
migration = db.create_branch("migration-test")
migration.query("MATCH (p:Person) SET p.full_name = p.first_name + ' ' + p.last_name")

# Si OK, appliquer sur main
# Si KO, delete migration et retry
```

#### 3. ML experiments
```python
# Baseline embeddings
baseline = db.branch("main")

# Expériences parallèles
llama3 = db.create_branch("llama3-embeddings")
openai = db.create_branch("openai-embeddings")

# Comparer les résultats
baseline_acc = eval_accuracy(baseline)
llama3_acc = eval_accuracy(llama3)
openai_acc = eval_accuracy(openai)

# Garder le meilleur
```

## Isolation complète

### Écriture parallèle

Chaque branche a son propre **writer lock** :

```python
# Thread 1
main.query("CREATE (p:Person {name: 'Alice'})")

# Thread 2 (parallèle, pas de contention)
experiment.query("CREATE (p:Person {name: 'Bob'})")
```

✅ **Zero contention** entre branches  
✅ **Zero downtime** : prod continue pendant les expériences

### Stockage efficace

Les branches partagent les segments immuables :

```
main:       [seg_001] [seg_002] [seg_003]
                ↓         ↓
experiment: [seg_001] [seg_002] [seg_004]  ← Partage 001+002
```

Seules les **divergences** sont stockées séparément.

## Nettoyage

### Garbage Collection

Les anciens snapshots sont conservés par défaut. Pour libérer de l'espace :

```python
# Supprimer les snapshots > 30 jours
db.gc(keep_days=30)

# Supprimer une branche
db.delete_branch("old-experiment")
```

### Stratégies de rétention

```python
# Garder tous les snapshots (audit)
db.gc(keep_days=None)

# Garder seulement 7 jours
db.gc(keep_days=7)

# Garder seulement le HEAD
db.gc(keep_days=0)
```

## Merge (futur)

:::note[Roadmap]
Le **merge de branches** est prévu dans une version future. Pour l'instant, utilisez des queries manuelles pour synchroniser les branches.
:::

```python
# Futur (v2.0+)
db.merge(source="experiment", target="main", strategy="fast-forward")
```

## Comparaison avec Git

| Feature | Git | CasysDB |
|---------|-----|---------|
| **Branches** | ✅ | ✅ |
| **Snapshots** | Commits | Manifests |
| **Time travel** | `git checkout <hash>` | `branch_at(timestamp)` |
| **Merge** | ✅ | 🚧 Roadmap |
| **Diff** | ✅ | 🚧 Roadmap |
| **Distributed** | ✅ | ❌ (local) |

## Exemples pratiques

### RAG avec expériences

```python
# Setup baseline
prod = db.default_branch()
prod.query("CREATE (d:Document {embedding: $emb})", {"emb": openai_embed("doc1")})

# Expérimenter avec LLaMA 3
llama3 = db.create_branch("llama3-test")
llama3.query("MATCH (d:Document) SET d.embedding = $new_emb", {"new_emb": llama3_embed("doc1")})

# Comparer accuracy
prod_results = search(prod, query="AI")
llama3_results = search(llama3, query="AI")

# Garder le meilleur
if llama3_score > prod_score:
    # Promouvoir llama3 → main
    pass
```

### Schema migrations

```python
# Test migration sur copie
migration = db.create_branch("add-full-name-field")
migration.query("""
  MATCH (p:Person)
  SET p.full_name = p.first_name + ' ' + p.last_name
""")

# Vérifier que ça marche
assert migration.query("MATCH (p:Person) WHERE p.full_name IS NULL RETURN count(p)") == 0

# Appliquer sur main
main = db.default_branch()
main.query("...")  # Reproduire migration
```

## Prochaines étapes

- [Transactions MVCC →](/core/transactions/)
- [Architecture →](/core/architecture/)
- [Python SDK →](/sdk/python/basics/)
