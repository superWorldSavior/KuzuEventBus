# Database Infrastructure

Implémentations pour la **persistance relationnelle** des données métier (hors fichiers Kuzu).

## 📂 Structure
```
database/
├── __init__.py
├── __tests__/                             # Tests d'intégration PostgreSQL
├── models.py                              # Modèles SQLAlchemy (CustomerAccount)
├── session.py                             # Gestion du moteur/session
└── tenant_repository.py                   # Adaptateur PostgresCustomerAccountRepository
```

## 🎯 Responsabilité
- Persister les comptes clients & tenants (API keys, quotas, statut)
- Fournir un point d'accès unique via `PostgresCustomerAccountRepository`
- Préparer l'ajout futur des métadonnées de bases (quotas, historiques)

## ✅ État Actuel
- PostgreSQL est désormais **obligatoire** pour l'application runtime
- `tenant_repository.py` implémente le port `CustomerAccountRepository`
- Tests d'intégration disponibles dans `database/__tests__/`

## 🗄️ Schéma utilisé
```sql
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY,
    tenant_name VARCHAR(50) UNIQUE NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    subscription_plan VARCHAR(32) DEFAULT 'trial',
    storage_quota_mb FLOAT DEFAULT 100,
    max_databases INTEGER DEFAULT 3,
    max_concurrent_queries INTEGER DEFAULT 5,
    subscription_started_at TIMESTAMP DEFAULT NOW(),
    subscription_expires_at TIMESTAMP,
    current_storage_usage_mb FLOAT DEFAULT 0,
    database_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    organization_name VARCHAR(100)
);
```

## ⚙️ Configuration
- `DATABASE_URL` (par défaut `postgresql+psycopg2://kuzu_user:kuzu_password@localhost:5432/kuzu_eventbus`)
- Le module `session.py` crée le moteur SQLAlchemy avec `pool_pre_ping=True`

## 🧪 Tests
- `database/__tests__/test_postgres_customer_account_repository.py`
- Les tests se mettent en SKIP si PostgreSQL n'est pas accessible (ex: Docker non démarré)

## 🔜 Roadmap
- Ajouter des migrations Alembic
- Etendre le schéma (historique de requêtes, quotas dynamiques)
- Intégrer Redis/MinIO pour les autres adaptateurs (cache, stockage)

---
**Rôle** : fournir une persistance fiable pour les tenants, base de toute authentification et gouvernance multi-tenant.

---

## 🗂️ Cheatsheet (état actuel)

- **Adapters actifs**
  - `PostgresCustomerAccountRepository` — comptes/tenants/API keys (fichier `tenant_repository.py`)
  - `PostgresKuzuDatabaseRepository` — catalogue des bases (fichier `kuzu_database_repository.py`)
  - `PostgresDatabaseMetadataRepository` — provisioning/metadata (fichier `database_metadata_repository.py`)
  - `PostgresSnapshotRepository` — snapshots (fichier `snapshot_repository.py`)

- **Dependency Injection**
  - `customer_repository()`
  - `kuzu_database_repository()`
  - `snapshot_repository()`

- **Environnement**
  - `DATABASE_URL` (SQLAlchemy DSN)

- **Tables clés (DDL synthétique)**
  - `customers` — tenants & API keys
  - `kuzu_databases` — id, tenant_id, name, filesystem_path, created_at
  - `kuzu_db_snapshots` — id, tenant_id, database_id, object_key, checksum, size_bytes, created_at

## 🔎 Contexte fonctionnel

- Les tenants et leurs clés API sont la source de vérité pour l’authentification multi-tenant.
- Le catalogue des bases (`kuzu_databases`) permet de lister, retrouver et supprimer les bases d’un tenant.
- Les snapshots sont historisés pour restaurations ultérieures; la donnée binaire est stockée sur MinIO, la ligne Postgres pointe vers l’objet (chemin S3-like) et porte les métadonnées (checksum, taille).
