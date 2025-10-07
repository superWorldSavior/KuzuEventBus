---
title: Installation
description: Install CasysDB for Python or TypeScript
---

CasysDB is available as a native library for **Python** and **TypeScript/Node.js**.

## Python Installation

### Via pip (Recommended)

```bash
pip install casys-db
```

### From source

```bash
git clone https://github.com/casysai/casysdb.git
cd casysdb/sdk/python
pip install maturin
maturin develop --release
```

### Requirements

- Python 3.8+
- pip or poetry

## TypeScript/Node.js Installation

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

### Requirements

- Node.js 18+
- npm, pnpm, or yarn

## Verify Installation

### Python

```python
from casys_db import Database

print(f"CasysDB installed successfully!")
db = Database(":memory:")
print(f"Database created: {db}")
```

### TypeScript

```typescript
import { Database } from 'casys-db';

console.log('CasysDB installed successfully!');
const db = new Database(':memory:');
console.log(`Database created: ${db}`);
```

## Next Steps

- [Quick Start Guide](/getting-started/quickstart/) - Get started in 5 minutes
- [Python SDK Basics](/sdk/python/basics/) - Learn Python API
- [TypeScript SDK Basics](/sdk/typescript/basics/) - Learn TypeScript API
