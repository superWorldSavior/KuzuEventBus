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
