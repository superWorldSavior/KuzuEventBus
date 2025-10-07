---
title: Transactions MVCC
description: Multi-Version Concurrency Control in CasysDB
head: []
sidebar:
  order: 2
---

CasysDB utilise **MVCC** (Multi-Version Concurrency Control) pour garantir des transactions isolées et cohérentes sans locks bloquants.

## Principes MVCC

### Snapshot Isolation
Chaque transaction voit un **snapshot immuable** de la base au moment de son démarrage.

```python
# Transaction 1
tx1 = db.begin_transaction()
alice = tx1.query("MATCH (p:Person {name: 'Alice'}) RETURN p")
# alice.age = 30

# Transaction 2 (modifie Alice pendant que tx1 lit)
tx2 = db.begin_transaction()
tx2.query("MATCH (p:Person {name: 'Alice'}) SET p.age = 31")
tx2.commit()

# Transaction 1 voit toujours age = 30 (snapshot isolation)
alice2 = tx1.query("MATCH (p:Person {name: 'Alice'}) RETURN p")
# alice2.age = 30 (pas 31)
```

### Avantages

✅ **Lectures non-bloquantes** : Les lecteurs ne bloquent jamais les écrivains  
✅ **Cohérence** : Snapshot isolation garantit des lectures répétables  
✅ **Concurrence élevée** : Multiples transactions simultanées sans contention  
✅ **Pas de deadlocks** : Design sans locks mutuels

## API Transactions

### Transaction explicite

```python
from casys_db import Database

db = Database("mydb.db")
tx = db.begin_transaction()

try:
    tx.query("CREATE (p:Person {name: 'Bob', age: 25})")
    tx.query("MATCH (a:Person), (b:Person) WHERE a.name = 'Alice' AND b.name = 'Bob' CREATE (a)-[:KNOWS]->(b)")
    tx.commit()  # Atomique: tout ou rien
except Exception as e:
    tx.rollback()
    raise
```

### Auto-commit (par défaut)

```python
# Chaque query est une transaction auto-commit
db.query("CREATE (p:Person {name: 'Charlie'})")
```

## Stratégie d'écriture

### Single-Writer, Multiple-Readers (SW-MR)

CasysDB utilise un modèle **SW-MR** :
- **Une seule transaction d'écriture** à la fois par branche
- **Multiples transactions de lecture** concurrentes
- Les écrivains créent de nouveaux segments (append-only)
- Les lecteurs accèdent aux segments immuables

```
Writers:  W1 ----commit--> [segment_001] (immutable)
                            W2 ----commit--> [segment_002]

Readers:  R1 (voit 001) -----> continue
          R2 (voit 001) -----> continue
          R3 (voit 001+002) --> nouvelle lecture après commit W2
```

### Write-Ahead Log (WAL)

Avant chaque commit, les modifications sont écrites dans le **WAL** :

1. **Append** : Écriture séquentielle dans le WAL
2. **Fsync** : Flush sur disque (durabilité)
3. **Publish** : Le snapshot devient visible
4. **Segment** : WAL consolidé en segments immuables

```
WAL → [tx_001.wal] → fsync → snapshot_001 → segment_001.dat
```

## Isolation Levels

CasysDB implémente **Snapshot Isolation** :

| Anomalie | Protection |
|----------|------------|
| **Dirty Read** | ✅ Impossible |
| **Non-Repeatable Read** | ✅ Impossible |
| **Phantom Read** | ✅ Impossible |
| **Write Skew** | ⚠️ Possible (standard SI) |

### Write Skew

Comme PostgreSQL et autres bases MVCC, CasysDB ne protège pas contre le **write skew** par défaut. Utilisez des contraintes ou des locks applicatifs si nécessaire.

## Performance

### Benchmarks (lecture concurrente)

```
100 readers simultanés sur 1M nodes :
- Throughput : ~50K queries/sec
- Latence p99 : <5ms
- Overhead MVCC : ~2% (vs. single-threaded)
```

### Coût mémoire

Chaque snapshot garde les métadonnées (pas les données complètes) :
- ~100 bytes par snapshot
- GC automatique des anciens snapshots

## Commits & Snapshots

### Cycle de vie

```python
tx = db.begin_transaction()  # Snapshot @ version N
tx.query("CREATE (p:Person)")
tx.commit()  # → version N+1 créée

# Snapshot N toujours accessible (PITR)
```

### Manifest

Chaque commit crée un **manifest** :

```json
{
  "version_ts": 1633024800,
  "branch": "main",
  "segments": ["segment_001", "segment_002"],
  "parent": "manifest_prev"
}
```

Les manifests forment une **chaîne immuable** (comme Git commits).

## Prochaines étapes

- [Branches & PITR →](/core/branches/)
- [Architecture →](/core/architecture/)
- [Quick Start →](/getting-started/quickstart/)
