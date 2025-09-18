# Domain Shared

Éléments **partagés** entre tous les domaines métier du système. Contient les building blocks fondamentaux et les contrats d'interface.

## 🏗️ Structure

```
shared/
├── value_objects.py          # Value Objects communs à tous les domaines
├── ports/                    # Interfaces (contrats) pour l'inversion de dépendance
│   ├── authentication.py    # Service d'authentification
│   ├── cache.py             # Service de cache
│   ├── database_management.py # Gestion des bases de données
│   ├── notifications.py     # Service de notifications
│   ├── query_execution.py   # Exécution de requêtes
│   └── tenant_management.py # Gestion des tenants
└── __tests__/               # Tests unitaires des éléments partagés
    └── test_value_objects.py
```

## 🎯 Responsabilités

### Value Objects Communs
- **Primitives métier** : EntityId, TenantName, EmailAddress
- **Événements** : DomainEvent pour l'event sourcing
- **Mesures** : StorageSize avec unités
- **Validation** : Règles de validation centralisées

### Ports (Interfaces)
- **Contrats d'abstraction** pour l'infrastructure
- **Inversion de dépendance** : le domaine définit ses besoins
- **Testabilité** : interfaces facilement mockables
- **Évolutivité** : changement d'implémentation sans impact domaine

## 📦 Value Objects

### `EntityId`
```python
@dataclass(frozen=True)
class EntityId:
    """Identifiant unique d'entité."""
    value: UUID = field(default_factory=uuid4)
    
    def __str__(self) -> str:
        return str(self.value)
```

**Usage :**
- Identifiant **immutable** pour toutes les entités
- Génération **automatique** UUID v4 si non fourni
- **Type-safe** : évite la confusion entre différents IDs

### `TenantName`
```python
@dataclass(frozen=True)
class TenantName:
    """Nom de tenant avec validation."""
    value: str

    def __post_init__(self) -> None:
        name = self.value.strip()
        if not name or len(name) < 3:
            raise ValidationError("Tenant name must be at least 3 characters")
        if len(name) > 50:
            raise ValidationError("Tenant name cannot exceed 50 characters")
        if not all(c.isalnum() or c in [" ", "-", "_"] for c in name):
            raise ValidationError("Tenant name contains invalid characters")
```

**Règles de validation :**
- ✅ **Longueur** : 3-50 caractères
- ✅ **Caractères** : alphanumériques + espaces, tirets, underscores
- ✅ **Nettoyage** : trim automatique
- ❌ **Caractères spéciaux** : pas d'émojis, symboles, etc.

### `EmailAddress`
```python
@dataclass(frozen=True)
class EmailAddress:
    """Adresse email avec validation."""
    value: str

    def __post_init__(self) -> None:
        email = self.value.strip().lower()
        if not email:
            raise ValidationError("Email cannot be empty")
        if len(email) > 255:
            raise ValidationError("Email too long")
        if not self._is_valid_email(email):
            raise ValidationError("Invalid email format")
```

**Fonctionnalités :**
- ✅ **Validation** : format email standard
- ✅ **Normalisation** : lowercase automatique
- ✅ **Longueur** : limite à 255 caractères
- ✅ **Nettoyage** : trim automatique

### `DomainEvent`
```python
@dataclass(frozen=True)
class DomainEvent:
    """Événement du domaine pour event sourcing."""
    event_id: EntityId = field(default_factory=EntityId)
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    event_type: str = field(default="")
    aggregate_id: EntityId = field(default_factory=EntityId)
    data: Dict[str, Any] = field(default_factory=dict)
```

**Usage futur :**
- **Event Sourcing** : traçabilité des changements
- **CQRS** : séparation lecture/écriture
- **Integration Events** : communication inter-domaines
- **Audit Trail** : historique des actions

### `StorageSize`
```python
@dataclass(frozen=True)
class StorageSize:
    """Taille de stockage avec unité."""
    value: float
    unit: StorageUnit = StorageUnit.BYTES
    
    def to_bytes(self) -> int:
        """Convertir en bytes."""
        multipliers = {
            StorageUnit.BYTES: 1,
            StorageUnit.KB: 1024,
            StorageUnit.MB: 1024 * 1024,
            StorageUnit.GB: 1024 * 1024 * 1024,
        }
        return int(self.value * multipliers[self.unit])
```

**Fonctionnalités :**
- ✅ **Unités** : bytes, KB, MB, GB
- ✅ **Conversion** : vers bytes pour calculs
- ✅ **Validation** : valeurs positives
- ✅ **Comparaison** : support des opérateurs

## 🔌 Ports (Interfaces)

### Philosophy des Ports
Les ports définissent **ce dont le domaine a besoin** sans spécifier **comment** c'est implémenté.

**Avantages :**
- 🔄 **Inversion de dépendance** : domaine indépendant de l'infrastructure
- 🧪 **Testabilité** : mocks faciles à créer
- 🔀 **Flexibilité** : changement d'implémentation transparent
- 📝 **Contrats clairs** : interfaces explicites

### `AuthenticationService`
```python
@runtime_checkable
class AuthenticationService(Protocol):
    """Service d'authentification et gestion des API keys."""
    
    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str: ...
    
    async def authenticate_api_key(self, api_key: str) -> bool: ...
    
    async def revoke_api_key(self, api_key: str) -> bool: ...
```

### `NotificationService`
```python
@runtime_checkable
class NotificationService(Protocol):
    """Service de notifications (email, SMS, push, etc.)."""
    
    async def send_notification(
        self, tenant_id: UUID, notification_type: str, title: str, message: str
    ) -> bool: ...
```

### `CacheService`
```python
@runtime_checkable
class CacheService(Protocol):
    """Service de cache distribué."""
    
    async def get(self, key: str) -> Optional[Any]: ...
    
    async def set(
        self, key: str, value: Any, expire_seconds: Optional[int] = None
    ) -> bool: ...
    
    async def delete(self, key: str) -> bool: ...
```

## 🧪 Tests

### Tests des Value Objects
```python
class TestTenantName:
    """Tests du value object TenantName."""
    
    def test_valid_tenant_name(self):
        """Test nom de tenant valide."""
        name = TenantName("valid-company")
        assert name.value == "valid-company"
    
    def test_invalid_tenant_name_too_short(self):
        """Test nom trop court."""
        with pytest.raises(ValidationError, match="at least 3 characters"):
            TenantName("ab")
    
    def test_invalid_tenant_name_special_chars(self):
        """Test caractères invalides."""
        with pytest.raises(ValidationError, match="invalid characters"):
            TenantName("company@123")
```

### Tests des Ports (Contrats)
```python
class TestAuthenticationServiceContract:
    """Tests du contrat AuthenticationService."""
    
    @pytest.mark.asyncio
    async def test_generate_api_key_contract(self):
        """Test que l'implémentation respecte le contrat."""
        service = SimpleAuthService()  # ou PostgreSQLAuthService()
        
        api_key = await service.generate_api_key(
            tenant_id=uuid4(),
            key_name="test-key",
            permissions=["read", "write"]
        )
        
        assert isinstance(api_key, str)
        assert len(api_key) > 0
```

## 🔧 Patterns et Conventions

### 1. Value Object Pattern
```python
@dataclass(frozen=True)  # Toujours immutable
class MyValueObject:
    value: str
    
    def __post_init__(self) -> None:
        """Validation immédiate à la construction."""
        if not self.value:
            raise ValidationError("Value cannot be empty")
        # Normalisation si nécessaire
        object.__setattr__(self, 'value', self.value.strip())
```

### 2. Protocol Pattern
```python
@runtime_checkable  # Permet isinstance() checks
class MyService(Protocol):
    """Documentation du contrat."""
    
    async def my_method(self, param: str) -> bool:
        """Documentation de la méthode."""
        ...  # Pas d'implémentation dans le Protocol
```

### 3. Factory Pattern
```python
class EntityId:
    @classmethod
    def from_string(cls, value: str) -> 'EntityId':
        """Factory method depuis string."""
        return cls(UUID(value))
    
    @classmethod
    def generate(cls) -> 'EntityId':
        """Factory method pour génération."""
        return cls(uuid4())
```

## 🚀 Évolution Future

### Value Objects Potentiels
- `DatabaseName` : noms de bases Kuzu
- `QueryString` : requêtes Cypher validées
- `PermissionSet` : ensemble de permissions
- `ApiKeyName` : noms de clés API
- `NotificationType` : types de notifications

### Ports Futurs
- `FileStorageService` : stockage de fichiers
- `MetricsService` : collecte de métriques
- `AuditService` : journal d'audit
- `BackupService` : sauvegarde des données
- `MonitoringService` : surveillance système

### Event Sourcing
```python
class CustomerRegisteredEvent(DomainEvent):
    """Événement : customer enregistré."""
    customer_id: UUID
    tenant_name: str
    admin_email: str
    
class CustomerSuspendedEvent(DomainEvent):
    """Événement : customer suspendu."""
    customer_id: UUID
    reason: str
```

## 💡 Bonnes Pratiques

### 1. Validation Early and Often
```python
def __post_init__(self) -> None:
    """Valider dès la construction."""
    self._validate()
    self._normalize()
```

### 2. Meaningful Error Messages
```python
if len(name) < 3:
    raise ValidationError(
        f"Tenant name '{name}' too short. Minimum 3 characters required."
    )
```

### 3. Explicit Dependencies
```python
# ✅ Bon : dépendance explicite via Protocol
class CustomerService:
    def __init__(self, auth_service: AuthenticationService): ...

# ❌ Mauvais : dépendance implicite
class CustomerService:
    def __init__(self): 
        self.auth = SomeConcreteAuthService()  # Couplage fort
```

### 4. Immutability by Default
```python
# ✅ Bon : Value Object immutable
@dataclass(frozen=True)
class TenantName: ...

# ❌ Éviter : Value Object mutable
@dataclass
class TenantName: ...  # Peut être modifié après création
```

---

**Principe clé** : Les éléments shared sont les **fondations solides** sur lesquelles tous les domaines s'appuient. Ils doivent être **stables**, **bien testés** et **évolutifs**.