# Infrastructure Layer - YAGNI Strategy & Architectural Decisions

Les **décisions d'architecture** qui permettent de démarrer simple tout en gardant la flexibilité pour évoluer.

## 🎯 Stratégie YAGNI : Pourquoi ce choix ?

### Le Problème Classique
La plupart des projets commencent par :
```
❌ "On va avoir besoin de PostgreSQL + Redis + RabbitMQ + Kubernetes"
❌ 3 mois de setup avant la première feature
❌ Over-engineering pour 0 utilisateur
❌ Budget explosé avant la validation du concept
```

### Notre Approche YAGNI
```
✅ Prototyper rapidement avec des implémentations mémoire
✅ Migrer vers des services persistants dès que la valeur est prouvée
✅ Conserver les adapters mémoire uniquement pour les tests/documentation
✅ Activer Redis/MinIO quand les métriques le justifieront
```

## 🧭 Contexte métier global

- **Pour qui**: équipes produit et développeurs qui veulent exploiter Kuzu (graph DB) sans se battre avec l’infra.
- **Problèmes clés**:
  - Isolation multi-tenant fiable et traçable.
  - Mise en route en < 5 minutes (enregistrement → API key → première base).
  - Sauvegarde/restauration simple et sûre (snapshots versionnés).
  - Requêtes potentiellement longues mais robustes (asynchrones, retriables).
  - Observabilité claire (logs/événements) et coût maîtrisé (YAGNI).
- **Réponse de l’infrastructure**:
  - Postgres = source de vérité (tenants, catalogue bases, snapshots) pour la gouvernance.
  - Redis = performance & robustesse (cache, queue jobs, verrous distribués) pour lisser la charge et garantir l’exclusivité.
  - MinIO = durabilité des artefacts (uploads, snapshots) avec chemins déterministes par tenant/base.
  - Kuzu Engine = exécution/stockage graphe, isolé par tenant via `KUZU_DATA_DIR`.
  - DI (FastAPI Depends) = remplacement d’adapters sans toucher au domaine (évolutivité sans réécrire le métier).
- **Principes d’engagement**:
  - Fail fast (validations explicites, verrous, swap atomique).
  - Asynchrone par défaut pour le long (jobs)
  - Documentation contractuelle via OpenAPI + READMEs infra orientés métier.

## 🗂️ Cheatsheet – Atlas des adapters actifs (MVP)

- **Auth** (`src/infrastructure/auth/`)
  - Adapters: `AllowAllAuthorizationService` (MVP), `ApiKeyAuthenticationService` (in-memory)
  - DI: `authorization_service()`, `auth_service()`
  - Env: N/A (MVP)

- **Cache / Queue / Locks** (`src/infrastructure/redis/`)
  - Adapters: `RedisCacheService`, `RedisMessageQueueService`, `RedisDistributedLockService`
  - DI: `cache_service()`, `message_queue_service()`, `lock_service()`
  - Env: `REDIS_URL`

- **Database (Postgres)** (`src/infrastructure/database/`)
  - Adapters: `PostgresCustomerAccountRepository`, `PostgresKuzuDatabaseRepository`, `PostgresDatabaseMetadataRepository`, `PostgresSnapshotRepository`
  - DI: `customer_repository()`, `kuzu_database_repository()`, `snapshot_repository()`
  - Env: `DATABASE_URL`

- **Kuzu** (`src/infrastructure/kuzu/`)
  - Adapters: `KuzuQueryServiceAdapter`, `KuzuDatabaseProvisioningAdapter`
  - Env: `KUZU_DATA_DIR`

- **File Storage (MinIO)** (`src/infrastructure/file_storage/`)
  - Adapter: `MinioFileStorageService`
  - DI: `file_storage_service()`
  - Env: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE`

- **Notifications** (`src/infrastructure/notifications/`)
  - Adapter: `LoggingNotificationService`
  - DI: `notification_service()`

## 🧩 Contexte fonctionnel – flux couverts par l’infra

- **Enregistrement client**: persistance tenant (Postgres), génération API key (in-memory MVP), notification logging, cache éventuel.
- **Gestion des bases**: provisioning Kuzu (création dir/fichier), métadonnées Postgres, listing par tenant.
- **Upload fichiers**: dépôt sur MinIO avec clé logique `tenants/{tenant_id}/{database_id}/{filename}`.
- **Snapshots/Restore**: verrou Redis (exclusivité), snapshot (répertoire → tar.gz / fichier `.kuzu`), stockage MinIO, métadonnées Postgres, swap atomique pour restore, invalidation cache.
- **Requêtes asynchrones**: job soumis dans Redis Streams, suivi via `TransactionRepository`, consultation via `/api/v1/jobs/{id}`.

---

**Principe clé** : YAGNI + Ports & Adapters = Start simple, **evolve confidently** based on **real needs** and **measured constraints**.

---

## ♻️ PITR (Point-In-Time Recovery)

### Objectif
Restaurer une base Kuzu à un timestamp précis en combinant:
- un snapshot (base complète) antérieur au timestamp cible,
- la relecture des WAL (mutations) jusqu’au timestamp cible.

### Conventions de stockage
- Snapshots MinIO:
  - `tenants/{tenant_id}/{database_id}/snapshot-YYYYMMDDThhmmssZ.tar.gz`
  - Format: tar.gz contenant `{database_id}/data.kuzu/` (répertoire complet)
  - **⚡ Snapshot automatique**: Un snapshot initial vide est créé automatiquement lors du provisioning d'une nouvelle base (depuis 2025-10-02). Cela garantit que PITR fonctionne dès le départ sans nécessiter de snapshot manuel.
- WAL MinIO:
  - `tenants/{tenant_id}/{database_id}/wal/wal-YYYYMMDDThhmmssZ.log`
  - Contenu: JSON lines `{"ts","query","parameters"}` (MVP: `parameters` facultatif)
  - Création automatique par le worker pour toutes les requêtes mutantes (CREATE, MERGE, DELETE, etc.)

### Verrous
- `db:{database_id}:pitr_restore` (exclusivité pendant PITR)
- `db:{database_id}:wal_append` (appel court, sérialisation lors de l’append WAL côté worker)
- `db:{database_id}:checkout` (worker: éviter restauration locale concurrente)

### Implémentations
- Use case restauration: `src/application/usecases/restore_database_pitr.py`
  - Trouve snapshot ≤ cible, restaure, liste WAL en range, rejoue via `KuzuQueryService`, invalide cache.
- Écriture WAL: `src/infrastructure/workers/query_worker.py`
  - Heuristique mutation (`CREATE|MERGE|DELETE|SET|DROP|ALTER|INSERT|UPDATE`), append JSON-line, lock court.
- Listing/plan UX: `src/application/usecases/list_database_pitr.py`
  - `GET /api/v1/databases/{id}/pitr?start=&end=&window=&include_types=&target=`
  - Retourne timeline (snapshots + `wal_windows`) et plan (snapshot choisi + WAL à rejouer) si `target` fourni.

### Endpoints
- `GET /api/v1/databases/{id}/pitr` → timeline et (optionnel) plan (si `target` fourni)
- `POST /api/v1/databases/{id}/restore-pitr?target_timestamp=...` → exécute PITR

### Exécution des tests d’intégration (optionnel)
- Test d’intégration PITR: `src/application/usecases/__tests__/test_pitr_integration.py`
- Pré-requis: MinIO accessible (`MINIO_*`), `KUZU_DATA_DIR` pour Kuzu.
- Lancer (idéalement dans le conteneur API):
```
docker compose -f docker-compose.dev.yml up -d minio api
docker compose -f docker-compose.dev.yml exec api pytest -q src/application/usecases/__tests__/test_pitr_integration.py
```
