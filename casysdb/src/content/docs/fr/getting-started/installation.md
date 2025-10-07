---
title: Installation
description: Installer CasysDB pour Python ou TypeScript
head: []
sidebar:
  order: 1
---

CasysDB est disponible comme bibliothèque native pour **Python** et **TypeScript/Node.js**.

## Installation Python

### Via pip (Recommandé)

```bash
pip install casys-db
```

### Depuis les sources

```bash
git clone https://github.com/casysai/casysdb.git
cd casysdb/sdk/python
pip install maturin
maturin develop --release
```

### Prérequis

- Python 3.8+
- pip ou poetry

## Installation TypeScript/Node.js

### Via npm

```bash
npm install casys-db
```

### Via pnpm

```bash
pnpm add casys-db
```

### Via yarn

```bash
yarn add casys-db
```

### Prérequis

- Node.js 18+
- npm, pnpm, ou yarn

## Vérifier l'Installation

### Python

```python
from casys_db import Database

print(f"CasysDB installé avec succès !")
db = Database(":memory:")
print(f"Base de données créée : {db}")
```

### TypeScript

```typescript
import { Database } from 'casys-db';

console.log('CasysDB installé avec succès !');
const db = new Database(':memory:');
console.log(`Base de données créée : ${db}`);
```

## Prochaines Étapes

- [Guide de Démarrage Rapide](/fr/getting-started/quickstart/) - Lancez-vous en 5 minutes
- [Bases de l'ORM](/fr/orm/basics/) - Requêtes sans GQL
- [Transactions & MVCC](/fr/core/transactions/) - Comprendre l'isolation
