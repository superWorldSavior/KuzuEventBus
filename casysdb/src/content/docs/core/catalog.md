---
title: Catalog
description: Index léger des branches et pointeurs de version
head: []
sidebar:
  order: 10
---

Le **catalog** est un index léger (fichier `catalog.json`) utilisé par le moteur pour:
- Lister les **branches** disponibles
- Résoudre les **HEAD** (dernier manifest par branche)
- Accélérer certaines requêtes de métadonnées

## Exemple minimal
```json
{
  "branches": {
    "main": { "latest": 1730899200 },
    "experiment": { "latest": 1730902800 }
  }
}
```

## Opérations
- `list_branches()` lit le catalog puis vérifie l’existence des manifests référencés
- Mise à jour atomique des pointeurs lors des commits

## Évolution
- Ajout d’heuristiques (ex: taille moyenne des segments, rétention)
- Caches dérivés pour accélérer les démarrages

## Liens
- [Branches →](/core/branches/)
- [Snapshots & Manifests →](/core/snapshots/)
- [Storage Layout →](/core/storage/)
