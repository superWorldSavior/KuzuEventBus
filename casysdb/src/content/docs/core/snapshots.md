---
title: Snapshots & Manifests
description: Chaîne immuable de versions et publication
head: []
sidebar:
  order: 7
---

Chaque **commit** publie un **manifest** qui référence une liste de **segments** immuables. Les manifests forment une **chaîne** (parent → enfant), ce qui autorise le **Time Travel (PITR)** et les **branches**.

## Manifest
```json
{
  "version_ts": 1730899200,
  "branch": "main",
  "segments": ["seg_001", "seg_002"],
  "parent": "manifest_prev"
}
```

## Publication d’un snapshot
```mermaid
sequenceDiagram
  participant Tx as Transaction
  participant WAL as WAL
  participant SEG as Segment builder
  participant MAN as Manifests/
  Tx->>WAL: Append ops
  WAL->>Tx: fsync ok
  Tx->>SEG: compact WAL → segments
  SEG->>MAN: write manifests/<ts>.json
  MAN-->>MAN: update latest pointer (atomic)
```

## Propriétés
- **Immuabilité**: lecture sûre, partage entre branches
- **Atomicité**: le pointeur `latest` n’avance que si tout a réussi
- **PITR**: remonter à un `version_ts` antérieur

## Liens
- [Branches →](/core/branches/)
- [Commit Flow →](/core/commit-flow/)
- [Storage Layout →](/core/storage/)
