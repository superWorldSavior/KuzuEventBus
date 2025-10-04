# SSE Events Hooks

Hooks React pour écouter les événements Server-Sent Events (SSE) du backend.

## Architecture

```
Backend (Python)
    ↓ emit_event()
Redis Streams (events:{tenant_id})
    ↓ xread()
GET /api/v1/events/stream (SSE)
    ↓ EventSource
SSE Connection Manager (à implémenter)
    ↓ window.dispatchEvent('sse:event')
React Hooks (useSSEEvents, useBranchEvents, etc.)
    ↓ callbacks
UI Components
```

## Hooks disponibles

### `useSSEEvents` - Hook générique

Écoute n'importe quel type d'événement SSE.

```tsx
import { useSSEEvents } from '@/shared/hooks/useSSEEvents';

function MyComponent() {
  useSSEEvents({
    eventTypes: ['database_created', 'snapshot_created'],
    handlers: {
      database_created: (event) => {
        console.log('DB created:', event.database_name);
      },
      snapshot_created: (event) => {
        console.log('Snapshot created:', event.snapshot_id);
      },
    },
    debug: true, // Enable console logs
  });
}
```

### `useBranchEvents` - Événements branches

```tsx
import { useBranchEvents } from '@/shared/hooks/useBranchEvents';
import { toast } from 'sonner';

function BranchManager() {
  const queryClient = useQueryClient();

  useBranchEvents({
    onBranchCreated: (event) => {
      toast.success(`Branch ${event.branch_name} created!`);
      queryClient.invalidateQueries(['branches']);
    },
    onBranchMerged: (event) => {
      toast.success(`Branch merged into ${event.target_database}`);
      queryClient.invalidateQueries(['databases']);
    },
    onBranchDeleted: (event) => {
      toast.info(`Branch ${event.branch_name} deleted`);
      queryClient.invalidateQueries(['branches']);
    },
  });

  return <div>...</div>;
}
```

### `useDatabaseEvents` - Événements databases

```tsx
import { useDatabaseEvents } from '@/shared/hooks/useDatabaseEvents';

function DatabaseDashboard() {
  const [isRestoring, setIsRestoring] = useState(false);

  useDatabaseEvents({
    onDatabaseCreated: (event) => {
      toast.success(`Database ${event.database_name} is ready!`);
    },
    onDatabaseRestored: (event) => {
      toast.success('Database restored successfully');
      setIsRestoring(false);
      refetchData();
    },
    onSnapshotCreated: (event) => {
      toast.success('Snapshot created');
    },
  });

  return <div>...</div>;
}
```

### `useSSEEvent` - Un seul type d'événement

```tsx
import { useSSEEvent } from '@/shared/hooks/useSSEEvents';

function RestoreButton() {
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);

  useSSEEvent(
    'database_restored',
    (event) => {
      if (event.database_id === pendingRestore) {
        toast.success('Restore complete!');
        setPendingRestore(null);
      }
    },
    {
      filter: (event) => event.database_id === pendingRestore,
      debug: true,
    }
  );

  return <button onClick={handleRestore}>Restore</button>;
}
```

## Types d'événements disponibles

### Databases
- ✅ `database_created` - Base créée
- ✅ `database_deleted` - Base supprimée
- ✅ `file_uploaded` - Fichier uploadé

### Snapshots & PITR
- ✅ `snapshot_created` - Snapshot créé
- ✅ `database_restored` - Restore PITR terminé

### Branches
- ✅ `branch_created` - Branche créée
- ✅ `branch_merged` - Branche mergée
- ✅ `branch_deleted` - Branche supprimée

### Queries
- ✅ `completed` - Query terminée (voir `useSSEQueryCompletion`)
- ✅ `timeout` - Query timeout
- ✅ `failed` - Query échouée
- ✅ `query_cancelled` - Query annulée

### Comptes
- ✅ `welcome` - Inscription
- ✅ `api_key_created` - Clé API créée
- ✅ `subscription_updated` - Abonnement mis à jour

## Structure des événements

Tous les événements SSE ont cette structure de base:

```typescript
interface SSEEvent {
  event_type: string;
  title: string;
  message: string;
  timestamp: string;
  // + metadata spécifique à chaque type
}
```

### Exemples de metadata par type

**branch_created**:
```json
{
  "event_type": "branch_created",
  "title": "Branch Created",
  "message": "Branch 'feature-test' created from 'main'",
  "timestamp": "2025-01-04T10:30:00Z",
  "branch_name": "feature-test",
  "full_name": "main--branch--feature-test",
  "parent_database": "main",
  "branch_database_id": "uuid",
  "snapshot_id": "uuid"
}
```

**database_restored**:
```json
{
  "event_type": "database_restored",
  "title": "Database Restored",
  "message": "Database 'main' restored to 2025-01-04 10:00:00 UTC",
  "timestamp": "2025-01-04T10:30:00Z",
  "database_id": "uuid",
  "target_timestamp": "2025-01-04T10:00:00Z",
  "snapshot_used": "uuid",
  "wal_files_replayed": "5"
}
```

## TODO: Implémenter le SSE Connection Manager

Le système écoute déjà les événements `window` custom (`sse:event`), mais il manque le gestionnaire de connexion SSE qui:

1. Crée l'`EventSource` vers `/api/v1/events/stream`
2. Parse les événements SSE reçus
3. Dispatch les événements via `window.dispatchEvent(new CustomEvent('sse:event', { detail: event }))`

**Fichier à créer**: `frontend/src/shared/services/sseConnectionManager.ts`

```typescript
// Exemple d'implémentation
export class SSEConnectionManager {
  private eventSource: EventSource | null = null;

  connect(apiKey: string) {
    const url = `${API_URL}/api/v1/events/stream`;
    this.eventSource = new EventSource(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    this.eventSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      window.dispatchEvent(new CustomEvent('sse:event', { detail: event }));
    };

    // Handle specific event types
    this.eventSource.addEventListener('branch_created', (e) => {
      const event = JSON.parse(e.data);
      window.dispatchEvent(new CustomEvent('sse:event', { detail: event }));
    });
  }

  disconnect() {
    this.eventSource?.close();
  }
}
```

## Intégration dans l'app

Initialiser le SSE Connection Manager au niveau racine de l'app:

```tsx
// App.tsx ou DashboardLayout.tsx
import { useEffect } from 'react';
import { sseManager } from '@/shared/services/sseConnectionManager';
import { useAuth } from '@/features/auth';

function App() {
  const { apiKey } = useAuth();

  useEffect(() => {
    if (apiKey) {
      sseManager.connect(apiKey);
      return () => sseManager.disconnect();
    }
  }, [apiKey]);

  return <YourApp />;
}
```

## Bonnes pratiques

1. **Toujours invalider les queries React Query** après un événement SSE
2. **Utiliser des toasts** pour feedback utilisateur immédiat
3. **Filtrer les événements** par ID quand nécessaire (database_id, branch_name, etc.)
4. **Debug mode** pendant le développement pour voir les événements
5. **Cleanup automatique** - Les hooks se désabonnent automatiquement au unmount
