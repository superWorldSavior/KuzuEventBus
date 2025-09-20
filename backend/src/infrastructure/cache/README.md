# Cache Infrastructure

Service de cache pour accélérer les lectures et réduire la charge sur les services persistants.

## 🗂️ Cheatsheet (état actuel)

- **Adapter actif**
  - `RedisCacheService` (dans `src/infrastructure/redis/redis_cache_service.py`)

  - `cache_service()` (dans `src/infrastructure/dependencies.py`)

- **Environnement**
  - `REDIS_URL` (ex: `redis://redis:6379/0`)

- **Clés utilisées (exemples)**
  - `db_info:{database_id}` — informations de base pour `GET /databases/{id}`

## 🔎 Contexte fonctionnel

- Le cache sert les endpoints de lecture (métadonnées DB, éventuellement d’autres fixtures) et est invalidé lors des opérations mutantes (upload, delete, restore).
- Objectif fonctionnel: réduire la latence perçue et amortir les lectures répétitives.

## 🔭 Prochaines étapes

- TTL par type de données (métadonnées vs résultats de requête).
- Invalidation par tenant et par pattern.
- Eventuellement un L1 (in-process) + L2 (Redis) pour des endpoints très fréquentés.