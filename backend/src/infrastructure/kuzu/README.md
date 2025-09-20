# Kuzu Infrastructure

Pont technique entre l’application et la base de données Kuzu (création et exécution).

## 🗂️ Cheatsheet (état actuel)

- **Adapters actifs**
  - `KuzuQueryServiceAdapter` — exécution (port `KuzuQueryService`) — fichier `kuzu_query_service.py`
  - `KuzuDatabaseProvisioningAdapter` — provisioning (port `DatabaseProvisioningService`) — fichier `../database/kuzu_database_provisioning.py`

- **Dependency Injection**
  - `kuzu_query_service()` (dans `src/infrastructure/dependencies.py`)

- **Environnement**
  - `KUZU_DATA_DIR` — racine des bases Kuzu (répertoires/fichiers créés par provisioning)

## 🔎 Contexte fonctionnel

- **Provisioning**: à la création d’une base, on prépare un chemin déterministe `KUZU_DATA_DIR/{tenant_id}/{db_name}/data.kuzu` (ou dossier). Cela permet l’isolation physique par tenant.
- **Exécution**: les requêtes ciblent le `filesystem_path` associé à un `database_id`, résolu via Postgres; l’adapter Kuzu ouvre la base à la demande.
- **Sûreté OP**: la restauration (overwrite) n’implique pas Kuzu directement; on opère un swap atomique au niveau du FS, et les ouvertures suivantes voient l’état restauré.

## 🔭 Prochaines étapes

- Exposition de `get_database_schema()` et `get_database_stats()` réels (aujourd’hui placeholders) pour enrichir `GET /databases/{id}`.
- Pool de connexions/optimisations si l’usage s’intensifie.