---
title: Concurrence SW‑MR
description: Single‑Writer, Multiple‑Readers
head: []
sidebar:
  order: 8
---

CasysDB applique un modèle **SW‑MR** (Single‑Writer, Multiple‑Readers) par **branche**.

## Règles
- **1 seul writer** par branche (verrou d’écriture par branche)
- **Lecteurs illimités**: lisent des **segments immuables**
- **Zéro blocage**: lecteurs et writer ne se bloquent pas

```mermaid
graph LR
  W1[Writer @main] -- commit --> S1((seg_001))
  R1[Reader A] --> S1
  R2[Reader B] --> S1
  W2[Writer @experiment] -- commit --> S2((seg_004))
  R3[Reader C] --> S2
```

## Avantages
- **Prévisible**: pas de deadlocks
- **Performant**: writer séquentiel, lecteurs en parallèle
- **Sûr**: crash du writer ≠ corruption des segments existants

## Liens
- [Transactions MVCC →](/core/transactions/)
- [Commit Flow →](/core/commit-flow/)
