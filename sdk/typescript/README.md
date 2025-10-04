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

**Note**: Toutes les opérations acceptent le **nom de la base** ou son **UUID**.

```typescript
// Lister toutes les bases
const databases = await client.listDatabases();

// Créer une base
const db = await client.createDatabase('my-graph-db');

// Obtenir les détails (par nom)
const dbInfo = await client.getDatabase('my-graph-db');

// Ou par UUID
const dbInfo2 = await client.getDatabase('550e8400-e29b-41d4-a716-446655440000');

// Supprimer une base (par nom)
await client.deleteDatabase('my-graph-db');
```

### Exécution de requêtes

#### Méthode 1: Fire & forget (async)

```typescript
// Soumettre une requête (retourne immédiatement)
const job = await client.submitQuery('my-graph-db', {
  query: 'MATCH (n:Person) RETURN n LIMIT 10'
});

// Vérifier le statut puis récupérer les résultats
const status = await client.getQueryStatus(job.transaction_id);
if (status.status === 'completed') {
  const results = await client.getJobResults(job.transaction_id);
  console.log('Résultats:', results.results);
}
```

#### Méthode 2: Attendre les résultats (recommandé)

```typescript
// Exécute et attend automatiquement (polling interne)
const result = await client.executeQuery(
  'my-graph-db',
  'MATCH (n:Person) WHERE n.age > $minAge RETURN n.name, n.age',
  {
    parameters: { minAge: 18 },
    pollInterval: 500,  // Vérifier toutes les 500ms
    timeout: 30000      // Timeout après 30s
  }
);
console.log('Résultats:', result.results);
```

### Snapshots

```typescript
// Créer un snapshot (backup complet)
const snapshot = await client.createSnapshot('my-graph-db');

// Lister les snapshots
const snapshots = await client.listSnapshots('my-graph-db');

// Restaurer depuis un snapshot
await client.restoreSnapshot('my-graph-db', snapshot.id);
```

### ⏰ Time Travel (Point-in-Time Recovery)

Le SDK offre une API simple pour voyager dans le temps. Le système **PITR automatique** suit toutes les modifications via snapshots + WAL, sans configuration manuelle.

```typescript
// 1. Explorer l'historique complet (auto-généré)
const history = await client.timeTravel.viewHistory('my-db', {
  from: 'yesterday',
  includeQueries: true  // Voir les queries jouées
});

console.log('Timeline:', history.events);
// → Snapshots automatiques, transactions, modifications...

// 2. Prévisualiser AVANT de restaurer (non-destructif !)
const preview = await client.timeTravel.preview('my-db', {
  at: '2 hours ago',
  query: 'MATCH (u:User) RETURN count(u)'
});

console.log('État à ce moment:', preview.queryResult);
console.log('Transactions rejouées:', preview.metadata.transactionsReplayed);

// 3. Voyager dans le temps (destructif - use preview first!)
await client.timeTravel.goBackTo('my-db', '2 hours ago');
```

**Formats de temps supportés** :
- ISO: `'2024-01-15T10:30:00Z'`
- Relatif: `'yesterday'`, `'2 hours ago'`, `'3 days ago'`
- Naturel: `'last week'`

**Avantages** :
- ✅ **Automatique** : Pas besoin de créer manuellement des points de restore
- ✅ **Précis** : Restaurez à n'importe quel timestamp (à la seconde près)
- ✅ **Preview** : Testez avant de restaurer (non-destructif)

### 🌿 Branches (Git-like pour databases)

Créez des branches isolées pour tester sans casser la prod :

```typescript
// 1. Créer branche depuis prod
const branch = await client.branches.create({
  sourceDatabase: 'prod-db',
  branchName: 'alice-test-migration',
  fromSnapshot: 'latest'  // ou 'yesterday', timestamp, snapshot ID
});

console.log('Branch créée:', branch.fullName);
// → 'prod-db--branch--alice-test-migration'

// 2. Travailler sur la branche (isolé, pas d'impact prod)
await client.executeQuery(branch.fullName, 'CREATE (:NewFeature {...})');
await client.executeQuery(branch.fullName, 'ALTER ...');
// Tests, migrations, etc.

// 3. Lister les branches
const branches = await client.branches.list('prod-db');

// 4. Décider du sort de la branche

// Option A: Merger vers prod (écrase prod !)
await client.branches.merge(branch.fullName, { 
  targetDatabase: 'prod-db' 
});

// Option B: Supprimer la branche (abandon)
await client.branches.delete(branch.fullName);
```

**Use cases** :
- ✅ **Testing** : Tester migrations/changements sur copie de prod
- ✅ **Multi-users** : Chaque dev a sa branche, pas de conflits
- ✅ **Safe** : Prod n'est jamais touchée jusqu'au merge

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

  console.log('Résultats:', result.results);

  // 6. Créer un snapshot
  const snapshot = await client.createSnapshot(db.id);
  console.log('Snapshot créé:', snapshot.id);
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
- **submitQuery(dbId, request)** → `Promise<QuerySubmitResponse>`
- **getQueryStatus(txId)** → `Promise<QueryStatusResponse>`
- **getJobResults(txId)** → `Promise<QueryResultsResponse>`
- **executeQuery(dbId, query, options)** → `Promise<QueryResultsResponse>`
- **createSnapshot(dbId)** → `Promise<Snapshot>`
- **listSnapshots(dbId)** → `Promise<Snapshot[]>`
- **restoreSnapshot(dbId, snapshotId)** → `Promise<RestoreResponse>`
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
