# File Storage Infrastructure

Stockage d’artefacts et de sauvegardes (snapshots) liés aux bases Kuzu.

## 🗂️ Cheatsheet (état actuel)

- **Adapter actif**
  - `MinioFileStorageService` — client MinIO S3-like (`src/infrastructure/file_storage/minio_service.py`)

- **Operations**
  - `upload_database(tenant_id, database_id, bytes, filename) -> s3://bucket/key`
  - `download_database(file_path)` (accepte `s3://...` ou clé relative)
  - `delete_database(file_path)`, `file_exists(file_path)`, `get_file_size(file_path)`

- **DI provider**
  - `file_storage_service()` (dans `src/infrastructure/dependencies.py`)

- **Environnement**
  - `MINIO_ENDPOINT` (ex: `minio:9000` en Docker)
  - `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
  - `MINIO_BUCKET` (défaut: `kuzu-databases`), `MINIO_SECURE` (`false` en dev)

- **Clés objets**
  - `tenants/{tenant_id}/{database_id}/{filename}` (ex: `snapshot-20250101T120000Z.tar.gz`)

## 🔎 Contexte fonctionnel

- Les uploads exposés par l’API permettent d’associer des fichiers (seeds, dumps) à une base donnée. 
- Les snapshots de bases (répertoire → tar.gz, fichier `.kuzu` → direct) sont stockés sur MinIO avec un chemin logique; Postgres ne conserve que la métadonnée et la clé d’objet.
- La restauration lit l’objet, opère en workspace temporaire puis remplace la base par swap atomique.

## 🔭 Prochaines étapes

- URL signées (pré-signed) pour téléchargement direct de snapshots.
- Politique de rétention (keep last N) par tenant et quotas.