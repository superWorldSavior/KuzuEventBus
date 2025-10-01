# Kuzu Event Bus - TypeScript SDK

SDK TypeScript pour interagir avec l'API Kuzu Event Bus depuis ton projet.

## 🚀 Installation

### Option 1: Copier dans ton projet

```bash
# Copier le dossier SDK dans ton projet
cp -r sdk/typescript/src your-project/src/kuzu-sdk

# Installer les dépendances
npm install cross-fetch
```

### Option 2: Build et link local

```bash
cd sdk/typescript

# Installer les dépendances
npm install

# Compiler le SDK
npm run build

# Créer un lien npm local
npm link

# Dans ton projet
cd /path/to/your-project
npm link @kuzu-eventbus/sdk
```

## 📖 Usage

### Configuration

```typescript
import { createKuzuClient } from '@kuzu-eventbus/sdk';

const client = createKuzuClient({
  baseUrl: 'http://localhost:8200',
  apiKey: 'kb_YOUR_API_KEY_HERE'
});
```

### Gestion des bases de données

```typescript
// Lister toutes les bases
const databases = await client.listDatabases();

// Créer une base
const db = await client.createDatabase('my-graph-db');

// Obtenir les détails
const dbInfo = await client.getDatabase(db.id);

// Supprimer une base
await client.deleteDatabase(db.id);
```

### Exécution de requêtes

#### Méthode 1: Fire & forget (async)

```typescript
// Soumettre une requête (retourne immédiatement)
const job = await client.submitQuery(databaseId, {
  query: 'MATCH (n:Person) RETURN n LIMIT 10'
});

// Vérifier le statut plus tard
const status = await client.getQueryStatus(job.transaction_id);

if (status.status === 'completed') {
  console.log('Résultats:', status.result);
}
```

#### Méthode 2: Attendre les résultats (avec polling)

```typescript
// Exécute et attend automatiquement (polling interne)
const result = await client.executeQuery(
  databaseId,
  'MATCH (n:Person) RETURN n.name, n.age',
  {
    parameters: { minAge: 18 },
    pollInterval: 500,  // Vérifier toutes les 500ms
    timeout: 30000      // Timeout après 30s
  }
);

console.log('Colonnes:', result.result.columns);
console.log('Lignes:', result.result.rows);
```

### Snapshots

```typescript
// Créer un snapshot
const snapshot = await client.createSnapshot(databaseId);

// Lister les snapshots
const snapshots = await client.listSnapshots(databaseId);

// Restaurer depuis un snapshot
await client.restoreSnapshot(databaseId, snapshot.snapshot_id);
```

### Événements temps réel (SSE)

```typescript
// S'abonner aux événements
const eventSource = await client.connectEventStream(
  (event) => {
    const data = JSON.parse(event.data);
    console.log('Événement reçu:', data);
    
    if (data.event_type === 'query.completed') {
      console.log('Query terminée:', data.transaction_id);
    }
  },
  (error) => {
    console.error('Erreur SSE:', error);
  }
);

// Fermer la connexion plus tard
eventSource.close();
```

## 🎯 Exemple complet

```typescript
import { createKuzuClient } from '@kuzu-eventbus/sdk';

async function main() {
  // 1. Initialiser le client
  const client = createKuzuClient({
    baseUrl: 'http://localhost:8200',
    apiKey: process.env.KUZU_API_KEY!
  });

  // 2. Créer une base
  const db = await client.createDatabase('users-graph');
  console.log('Base créée:', db.id);

  // 3. Exécuter une query de création
  await client.executeQuery(db.id, `
    CREATE NODE TABLE Person(name STRING, age INT64, PRIMARY KEY(name))
  `);

  // 4. Insérer des données
  await client.executeQuery(db.id, `
    CREATE (:Person {name: 'Alice', age: 30})
  `);

  // 5. Requêter les données
  const result = await client.executeQuery(db.id, `
    MATCH (p:Person) RETURN p.name, p.age
  `);

  console.log('Résultats:', result.result?.rows);

  // 6. Créer un snapshot
  const snapshot = await client.createSnapshot(db.id);
  console.log('Snapshot créé:', snapshot.snapshot_id);
}

main().catch(console.error);
```

## 🔧 Configuration avancée

### Utilisation avec NestJS

```typescript
// kuzu.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KuzuEventBusClient } from '@kuzu-eventbus/sdk';

@Module({
  providers: [
    {
      provide: 'KUZU_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new KuzuEventBusClient({
          baseUrl: config.get('KUZU_API_URL'),
          apiKey: config.get('KUZU_API_KEY'),
        });
      },
    },
  ],
  exports: ['KUZU_CLIENT'],
})
export class KuzuModule {}

// Utilisation dans un service
@Injectable()
export class GraphService {
  constructor(
    @Inject('KUZU_CLIENT') private kuzu: KuzuEventBusClient
  ) {}

  async findUsers() {
    return this.kuzu.executeQuery(
      this.databaseId,
      'MATCH (u:User) RETURN u'
    );
  }
}
```

### Utilisation avec Express

```typescript
// server.ts
import express from 'express';
import { createKuzuClient } from '@kuzu-eventbus/sdk';

const app = express();
const kuzu = createKuzuClient({
  baseUrl: process.env.KUZU_API_URL!,
  apiKey: process.env.KUZU_API_KEY!,
});

app.get('/users', async (req, res) => {
  try {
    const result = await kuzu.executeQuery(
      'my-db-id',
      'MATCH (u:User) RETURN u.name, u.email'
    );
    res.json(result.result?.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## 🧪 Tests

```typescript
import { createKuzuClient } from '@kuzu-eventbus/sdk';

describe('Kuzu SDK', () => {
  const client = createKuzuClient({
    baseUrl: 'http://localhost:8200',
    apiKey: 'kb_test_key'
  });

  it('should list databases', async () => {
    const dbs = await client.listDatabases();
    expect(Array.isArray(dbs)).toBe(true);
  });
});
```

## 📚 API Reference

### `KuzuEventBusClient`

#### Methods

- `listDatabases()` → `Promise<Database[]>`
- `createDatabase(name)` → `Promise<Database>`
- `getDatabase(id)` → `Promise<Database>`
- `deleteDatabase(id)` → `Promise<void>`
- `submitQuery(dbId, request)` → `Promise<QueryJob>`
- `getQueryStatus(txId)` → `Promise<QueryResult>`
- `executeQuery(dbId, query, options)` → `Promise<QueryResult>`
- `createSnapshot(dbId)` → `Promise<{ snapshot_id: string }>`
- `listSnapshots(dbId)` → `Promise<unknown[]>`
- `restoreSnapshot(dbId, snapshotId)` → `Promise<void>`
- `connectEventStream(onEvent, onError)` → `Promise<EventSource>`

## 🔑 Obtenir une API Key

```bash
# S'inscrire via l'API
curl -X POST http://localhost:8200/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "your-secure-password"
  }'

# Réponse contient l'API key
{
  "api_key": "kb_...",
  "customer_id": "..."
}
```

## 🤝 Support

- Documentation API: http://localhost:8200/docs
- Issues: GitHub Issues
