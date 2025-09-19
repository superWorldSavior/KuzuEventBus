# Redis Infrastructure

Services Redis pour cache, file de messages (jobs) et verrous distribués (exclusivité opérationnelle).

## 🗂️ Cheatsheet (état actuel)

- **Adapters actifs**
  - `RedisCacheService` — cache de métadonnées (lecture rapide)
  - `RedisMessageQueueService` — file de jobs (ex: exécution de requêtes asynchrones)
  - `RedisDistributedLockService` — verrous pour opérations critiques (snapshot/restore)

- **Dependency Injection** (voir `src/infrastructure/dependencies.py`)
  - `cache_service()` → `RedisCacheService`
  - `message_queue_service()` → `RedisMessageQueueService`
  - `lock_service()` → `RedisDistributedLockService`

- **Environnement**
  - `REDIS_URL` (ex: `redis://redis:6379/0`)

- **Clés/Streams usuels (exemples)**
  - Cache: `db_info:{database_id}` — métadonnées d’une base
  - Locks: `lock:db:{database_id}:snapshot`, `lock:db:{database_id}:restore`
  - Queue/Streams: `queries` (soumissions), `queries:{tenant_id}` (partitionnement possible)

## 🔎 Contexte fonctionnel

- **Cache**: accélère les endpoints de lecture; invalidé lors des mutations (upload, delete, restore) pour garantir la fraîcheur.
- **Queue (jobs)**: les requêtes lourdes sont soumises en asynchrone et traitées par le `worker` (voir service `worker` dans `docker-compose.yml`).
- **Locks**: assurent l’exclusivité pendant `snapshot` et `restore` pour éviter corruption/incohérences.

Objectif business: garder une latence basse et une expérience fiable même quand la charge augmente, sans exposer les utilisateurs à des états partiellement mis à jour.

## 🔭 Prochaines étapes

- DLQ (Dead Letter Queue) + politique de retries pour jobs échoués.
- TTL et policies de cache par type de données.
- Instrumentation (latence, taux de hit, taille des streams) et alerting.
