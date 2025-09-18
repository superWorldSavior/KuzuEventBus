# Copilot Instructions - Kuzu Event Bus

## 🎯 Projet : Service Multi-tenant Kuzu Database

**Service REST** pour gérer des bases de données Kuzu avec isolation par tenant, construit avec **FastAPI** et **architecture hexagonale**.

## 🏗️ Architecture & Principes

### Architecture Hexagonale
```
src/
├── domain/              # Logique métier pure (Customer, Tenant, etc.)
├── application/         # Services d'orchestration 
├── infrastructure/      # Adapters techniques (memory, DB, cache)
└── api/                # Interface REST (FastAPI)
```

### Principe YAGNI (You Ain't Gonna Need It)
- **Implémentations simples d'abord** : Memory-based pour le MVP
- **Migration progressive** : Vers PostgreSQL/Redis quand nécessaire
- **Pas de sur-ingénierie** : Une feature à la fois

## 📝 Standards de Code

### 1. Architecture Hexagonale STRICTE
```python
# ✅ BON : Domain ne dépend de rien
class CustomerAccount:
    def validate_storage_quota(self) -> bool:
        return self.usage < self.quota

# ❌ MAUVAIS : Domain dépend d'infrastructure  
class CustomerAccount:
    def save_to_database(self):  # Infrastructure leak!
        pass
```

### 2. Ports & Adapters Pattern
```python
# ✅ BON : Port (interface) dans domain/shared/ports/
@runtime_checkable
class CustomerAccountRepository(Protocol):
    async def save(self, customer: CustomerAccount) -> str: ...

# ✅ BON : Adapter dans infrastructure/
class InMemoryCustomerRepository:
    async def save(self, customer: CustomerAccount) -> str:
        # Implementation
```

### 3. Type Safety OBLIGATOIRE
```python
# ✅ BON : Type hints partout
def register_customer(
    tenant_name: str, 
    email: str
) -> CustomerRegistrationResult:
    pass

# ❌ MAUVAIS : Pas de types
def register_customer(tenant_name, email):
    pass
```

### 4. Exception Handling
```python
# ✅ BON : Exceptions métier spécifiques
class BusinessRuleViolation(Exception):
    pass

# ✅ BON : Validation explicite
if not tenant_name:
    raise ValidationError("Tenant name required")

# ❌ MAUVAIS : Retourner None/False silencieusement
if not tenant_name:
    return None
```

### 5. Dataclasses pour Value Objects
```python
# ✅ BON : Immutable value objects
@dataclass(frozen=True)
class TenantName:
    value: str
    
    def __post_init__(self):
        if len(self.value) < 3:
            raise ValidationError("Too short")

# ❌ MAUVAIS : Classes mutables
class TenantName:
    def __init__(self, value):
        self.value = value  # Mutable!
```

## 🧪 Tests & TDD

### Test-First Development
```python
# 1. RED : Test qui échoue
def test_customer_registration():
    service = CustomerAccountService(...)
    
    with pytest.raises(ValidationError):
        service.register("", "invalid@email")

# 2. GREEN : Code minimal pour passer
def register(self, tenant_name: str, email: str):
    if not tenant_name:
        raise ValidationError("Required")
    # ...

# 3. REFACTOR : Améliorer sans casser
```

### Structure des Tests
```python
# ✅ BON : Tests unitaires par couche
tests/
├── domain/              # Tests des entités et value objects
├── application/         # Tests des services d'orchestration
├── infrastructure/      # Tests des adapters
└── api/                # Tests d'intégration API
```

### Mocking Strategy
```python
# ✅ BON : Mock les ports (interfaces)
@pytest.fixture
def mock_customer_repo():
    return AsyncMock(spec=CustomerAccountRepository)

# ❌ MAUVAIS : Mock les implémentations concrètes
def mock_postgres_repo():
    pass
```

## 🚀 FastAPI Guidelines

### Dependency Injection
```python
# ✅ BON : Factory functions pour YAGNI
def get_customer_service() -> CustomerAccountService:
    return CustomerAccountService(
        account_repository=InMemoryTenantRepository(),
        auth_service=SimpleAuthService(),
    )

# Future : DI Container quand complexité augmente
```

### Request/Response Models
```python
# ✅ BON : Pydantic models séparés
class CustomerRegistrationRequest(BaseModel):
    tenant_name: str = Field(min_length=3)
    organization_name: str
    admin_email: EmailStr

class CustomerRegistrationResponse(BaseModel):
    customer_id: UUID
    tenant_name: str
    api_key: str
```

### Error Handling
```python
# ✅ BON : Mapping exceptions -> HTTP status
try:
    result = await service.register_customer(...)
except ValidationError as e:
    raise HTTPException(status_code=400, detail=str(e))
except BusinessRuleViolation as e:
    raise HTTPException(status_code=409, detail=str(e))
```

## 🗂️ Naming Conventions

### Files & Modules
```
✅ snake_case pour fichiers : customer_account.py
✅ PascalCase pour classes : CustomerAccount
✅ camelCase pour méthodes : registerCustomer() 
❌ Non : kebab-case pour fichiers Python
```

### Domain Language
```python
# ✅ BON : Langage métier explicite
class CustomerAccount:
    def validate_storage_quota(self) -> bool: pass
    def increment_database_count(self) -> None: pass

# ❌ MAUVAIS : Jargon technique
class User:  # Trop vague
    def check_limit(self) -> bool: pass  # Quelle limite ?
```

## 📦 Dependencies & Libraries

### Core Stack
```python
# API Layer
fastapi>=0.104.0
pydantic>=2.4.0
uvicorn>=0.24.0

# Testing  
pytest>=7.4.0
pytest-asyncio>=0.21.0

# Development
black>=23.9.0
isort>=5.12.0
mypy>=1.6.0

#Logging
Loguru
```

### YAGNI Approach
```python
# ✅ Démarrer simple
InMemoryTenantRepository()

# ✅ Migrer quand nécessaire  
PostgreSQLTenantRepository(db_pool)

# ❌ Pas de over-engineering prématuré
ComplexCacheWithRedisAndMemcachedAndConsul()
```

## 🔐 Security Guidelines

### API Keys
```python
# ✅ BON : Préfixe + random secure
def generate_api_key() -> str:
    return f"kb_{secrets.token_urlsafe(32)}"

# ✅ BON : Validation format
if not api_key.startswith("kb_"):
    raise ValidationError("Invalid API key format")
```

### Input Validation
```python
# ✅ BON : Validation Pydantic + Domain
class TenantName:
    def __post_init__(self):
        if not re.match(r'^[a-z0-9-]+$', self.value):
            raise ValidationError("Invalid characters")
```

## 🎯 Current MVP Scope

**Implémenté :**
- ✅ Customer registration avec API key
- ✅ Health checks
- ✅ Architecture hexagonale complète
- ✅ Tests unitaires (84 tests passent)

**Prochaines étapes (dans l'ordre YAGNI) :**
1. Auth par API key sur endpoints
2. Database management endpoints
3. Query execution basique
4. Migration vers PostgreSQL/Redis (seulement si nécessaire)

## 💡 Code Generation Guidelines

Quand tu génères du code :

1. **Respecte l'architecture hexagonale** - Pas de dépendances inversées
2. **Type hints obligatoires** - Mypy doit passer
3. **Tests en premier** - TDD approach
4. **YAGNI mindset** - Simple d'abord, complexe plus tard
5. **Domain language** - Utilise le vocabulaire métier
6. **Immutable value objects** - Frozen dataclasses
7. **Exception explicit** - Pas de None/False silencieux
8. **Async/await** - Pour tous les I/O

**Mission :** Construire un service **simple**, **testable** et **évolutif** qui respecte les principes de Clean Architecture et YAGNI.