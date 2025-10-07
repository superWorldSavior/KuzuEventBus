---
title: Commit Flow
description: Chemin critique du commit et garanties
head: []
sidebar:
  order: 9
---

Le **commit** suit un chemin strict pour garantir la **durabilité** et la **cohérence**.

## Étapes
```mermaid
sequenceDiagram
  participant Tx as Transaction (writer)
  participant WAL as WAL
  participant FS as Disk
  participant Seg as Segments/
  participant Man as Manifests/
  Tx->>WAL: 1) Append toutes les opérations
  WAL->>FS: 2) fsync (durabilité)
  Tx->>Seg: 3) Compacter WAL → segments immuables
  Seg->>Man: 4) Écrire manifest (snapshot)
  Man-->>Man: 5) Avancer latest (atomique)
```

## Garanties
- **Atomicité**: latest n’avance qu’une fois le manifest écrit
- **Durabilité**: fsync avant publication
- **Lisibilité**: lecteurs lisent uniquement des snapshots publiés

## Défaillances et reprise
- Si crash avant `fsync`: la transaction est perdue (sécurité > commodité)
- Si crash après `fsync` mais avant publication: recovery lit WAL et ignore manifest absent
- Si manifest partiel: ignoré (validation JSON + atomie du pointeur)

## Liens
- [WAL →](/core/wal/)
- [Snapshots & Manifests →](/core/snapshots/)
- [Concurrence SW‑MR →](/core/concurrency/)
