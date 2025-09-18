# Memory Infrastructure

Implémentations **en mémoire** pour le développement et les tests, suivant le principe YAGNI.

## 📂 Structure Actuelle

```
memory/
├── __init__.py
├── __tests__/                    # Tests des implémentations
├── auth_service.py              # Service d'authentification simple
├── cache_service.py             # Cache en mémoire
├── notification_service.py     # Notifications mockées
└── tenant_repository.py        # Repository en mémoire
```

## 🎯 Responsabilité

**Fournit les implémentations concrètes** des ports domain pour :
- Persistance des données (en mémoire)
- Authentification (génération de clés simples)
- Cache (dictionnaire Python)
- Notifications (logs)

## 📋 Implémentations Actuelles

### `tenant_repository.py` - InMemoryTenantRepository
```python
# Stockage en mémoire des tenants et customers
_tenants = {}  # tenant_name -> TenantAccount
_customers = {}  # customer_id -> Customer

# Méthodes implémentées :
- save_tenant(tenant)
- get_tenant_by_name(tenant_name)
- save_customer(customer)
- get_customer_by_id(customer_id)
```

### `auth_service.py` - SimpleAuthService
```python
# Génération simple de clés API
def generate_api_key() -> str:
    return f"kuzu_{uuid4().hex[:16]}"

# Validation basique
def validate_api_key(api_key: str) -> bool:
    return api_key.startswith("kuzu_") and len(api_key) == 21
```

### `cache_service.py` - InMemoryCacheService
```python
# Cache basique avec dictionnaire
_cache = {}

# Opérations CRUD simples
- get(key)
- set(key, value, ttl=None)
- delete(key)
- clear()
```

### `notification_service.py` - InMemoryNotificationService
```python
# Mock des notifications avec logging
def send_welcome_email(email, tenant_name, api_key):
    logger.info(f"Welcome email sent to {email}")
    # Pas d'envoi réel, juste du logging
```

## 🧪 Tests

Dossier `__tests__/` contient les tests unitaires de chaque implémentation.

**Couverture actuelle :**
- Tests des repositories en mémoire
- Tests des services d'auth et cache
- Tests de l'isolation des données par tenant

## 💡 Principe YAGNI

**Pourquoi en mémoire ?**
- ✅ **Démarrage rapide** : Pas de setup infrastructure
- ✅ **Tests simples** : Pas de mocks complexes
- ✅ **Development facile** : Redémarrage = reset complet
- ✅ **Proof of concept** : Valide la logique business

**Quand migrer ?**
- Persistance needed : → PostgreSQL/MongoDB repository
- Auth production : → JWT/OAuth service
- Cache distribué : → Redis service
- Notifications réelles : → SendGrid/SES service

## 🔄 Migration Path

```python
# Actuel
tenant_repo = InMemoryTenantRepository()

# Future
tenant_repo = PostgreSQLTenantRepository(db_pool)
# Même interface, implémentation différente
```

**Avantage hexagonal :** Changement d'implémentation sans impact sur la logique business.

---

**Rôle :** Implémentations **simples et temporaires** permettant le développement rapide sans infrastructure complexe.