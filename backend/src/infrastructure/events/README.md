# SSE Events Infrastructure

Service d'émission d'événements temps réel vers le frontend via Redis Streams et Server-Sent Events (SSE).

## 🗂️ Architecture

```
Frontend (EventSource)
    ↓ subscribe
GET /api/v1/events/stream
    ↓ xread
Redis Streams: events:{tenant_id}
    ↑ xadd
SSEEventService
    ↑ send_notification()
Use Cases (DB, Snapshots, Queries, etc.)
```

## 📦 Composants

### SSEEventService
- **Rôle**: Implémente `NotificationService` en émettant via Redis Streams
- **Stream**: `events:{tenant_id}` (un stream par tenant)
- **Rétention**: 10,000 événements par stream (configurable)
- **Format**: Événements structurés avec `event_type`, `title`, `message`, `metadata`

### Endpoint SSE
- **Route**: `GET /api/v1/events/stream`
- **Fichier**: `backend/src/presentation/api/events/routes.py`
- **Mécanisme**: Streaming via `xread()` avec support `Last-Event-ID`

## 🔎 Événements émis

### Databases
- ✅ `database_created` - Provisioning terminé (`provision_tenant_resources.py`)
- ✅ `database_deleted` - Base supprimée (`delete_kuzu_database.py`)
- ✅ `file_uploaded` - Fichier uploadé (`upload_kuzu_database_file.py`)

### Snapshots & PITR
- ✅ `snapshot_created` - Snapshot créé (`create_database_snapshot.py`)
- ✅ `database_restored` - Restore PITR terminé (`restore_database_pitr.py`)

### Branches
- ✅ `branch_created` - Branche créée (`create_branch.py`)
- ✅ `branch_merged` - Branche mergée (`merge_branch.py`)
- ✅ `branch_deleted` - Branche supprimée (`delete_branch.py`)

### Queries (émis par QueryWorker)
- ✅ `completed` - Query terminée avec succès
- ✅ `timeout` - Query timeout
- ✅ `failed` - Query échouée
- ✅ `query_cancelled` - Query annulée (`cancel_query.py`)

### Comptes
- ✅ `welcome` - Inscription client (`register_customer.py`)
- ✅ `api_key_created` - Clé API créée (`create_customer_api_key.py`)
- ✅ `subscription_updated` - Abonnement mis à jour (`update_customer_subscription_status.py`)

## 💻 Usage

### Dans un Use Case

```python
from src.domain.shared.ports.notifications import EventService

class MyUseCase:
    def __init__(self, events: EventService | None = None):
        self._events = events
    
    async def execute(self, req):
        # ... business logic ...
        
        # Emit event (best-effort)
        if self._events:
            try:
                await self._events.emit_event(
                    tenant_id=req.tenant_id,
                    event_type="my_event",
                    title="Action Completed",
                    message="Your action completed successfully",
                    metadata={"entity_id": str(entity.id), "status": "success"},
                )
            except Exception:
                pass  # Best-effort event emission
```

### Configuration

**Dependency Injection** (`backend/src/infrastructure/dependencies.py`):
```python
def event_service() -> EventService:
    return SSEEventService(redis_connection())
```

**Environnement**:
- Redis requis (voir `backend/.env`)
- Stream key: `events:{tenant_id}`
- Max length: 10,000 événements (ajustable dans le constructeur)

## 🧪 Tests

- **Tests unitaires**: `backend/src/infrastructure/events/__tests__/test_sse_event_service.py`
- **4 tests** avec mock Redis (`FakeRedis`)
- **Couverture**: émission, multi-events, isolation tenant, trimming

## 🔭 Prochaines étapes

- Ajout de filtres par `event_type` dans l'endpoint SSE
- Métriques sur le volume d'événements par tenant
- Support de reconnexion avec rattrapage automatique (déjà supporté via `Last-Event-ID`)
- Ajout d'un système de notification persistant (inbox-style) si besoin métier

## 📚 Différence avec query_transactions

**Redis Streams: `query_transactions`** (Queue de jobs)
- Pattern: Producer → Consumer Groups → Workers
- Usage: Traitement async des queries
- Consommation: `QueryWorker` via `xreadgroup()`

**Redis Streams: `events:{tenant_id}`** (Broadcast SSE)
- Pattern: Producer → SSE → Frontend
- Usage: Notifications temps réel
- Consommation: Frontend via `/api/v1/events/stream`

Ce sont deux streams séparés avec des responsabilités distinctes.
