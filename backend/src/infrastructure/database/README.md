# Database Infrastructure

Implémentations pour la **persistance des données métier** (hors Kuzu).

## 📂 Structure Actuelle

```
database/
└── __init__.py                 # Module vide - préparé pour l'évolution
```

## 🎯 Responsabilité

**Fournira les implémentations** des repositories pour :
- Persistance des comptes clients et tenants
- Métadonnées des bases de données Kuzu
- Configuration et audit logs

## 📋 État Actuel

**Status :** Module préparé mais pas encore implémenté

**Contenu actuel :**
- Fichier `__init__.py` vide
- En attente des besoins de persistance production

**Implémentation temporaire :** Actuellement utilisée dans `memory/database_service.py`

## 🔄 Implémentations Futures

Quand ce module sera développé, il contiendra :

### PostgreSQL Repository
```python
# Repository avec PostgreSQL
class PostgreSQLTenantRepository:
    def save_tenant(tenant: TenantAccount) -> str
    def get_tenant_by_name(tenant_name: str) -> Optional[TenantAccount]
    def save_customer(customer: Customer) -> str
    def get_customer_by_id(customer_id: str) -> Optional[Customer]
```

### Database Migrations
```python
# Gestion des migrations de schéma
class DatabaseMigrator:
    def run_migrations() -> None
    def create_tenant_tables() -> None
    def rollback_migration(version: str) -> None
```

### Connection Pool Management
```python
# Pool de connexions optimisé
class DatabasePool:
    def get_connection() -> Connection
    def release_connection(conn: Connection) -> None
    def health_check() -> bool
```

## 🗄️ Schéma de Base Attendu

```sql
-- Tables pour la persistance des tenants et customers
CREATE TABLE tenants (
    tenant_name VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY,
    tenant_name VARCHAR(50) REFERENCES tenants(tenant_name),
    organization_name VARCHAR(100) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    subscription_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_customers_tenant ON customers(tenant_name);
CREATE INDEX idx_customers_api_key ON customers(api_key);
```

## 📦 Dépendances Futures

```python
# requirements.txt (quand implémenté)
asyncpg>=0.28.0           # PostgreSQL async driver
SQLAlchemy>=2.0.0         # ORM
alembic>=1.12.0           # Migrations
psycopg2-binary>=2.9.0    # PostgreSQL sync driver
```

## 🔧 Configuration Future

```python
# Configuration base de données
DATABASE_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "kuzu_eventbus",
    "username": "kuzu_user", 
    "password": "secure_password",
    "pool_size": 10,
    "max_overflow": 20
}
```

---

**Rôle :** Module préparé pour la persistance relationnelle des données métier quand le stockage en mémoire deviendra insuffisant.