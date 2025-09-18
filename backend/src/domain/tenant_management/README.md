# Tenant Management Domain

Domaine métier responsable de la **gestion des comptes clients** (tenants) dans le système multi-tenant.

## 🏗️ Structure

```
tenant_management/
├── customer_account.py       # Entité Customer et logique métier
└── __tests__/               # Tests unitaires du domaine (futures)
    └── test_customer_account.py
```

## 🎯 Responsabilités

### Gestion des Comptes Clients
- **Création** de nouveaux comptes clients
- **Activation/Suspension** des comptes
- **Validation** des règles métier
- **État** et cycle de vie des comptes

### Règles Métier
- **Unicité** : un seul compte par nom de tenant
- **Validation** : email et nom de tenant valides
- **États** : gestion du cycle de vie (PENDING → ACTIVE → SUSPENDED)
- **Audit** : traçabilité des changements

## 📦 Entités

### `CustomerAccount`

**Entité racine** représentant un compte client dans le système.

```python
@dataclass
class CustomerAccount:
    """Compte client avec logique métier."""
    
    id: EntityId
    name: TenantName
    email: EmailAddress
    status: CustomerAccountStatus
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = field(default=None)
    
    def activate(self) -> None:
        """Activer le compte client."""
        if self.status == CustomerAccountStatus.SUSPENDED:
            self.status = CustomerAccountStatus.ACTIVE
            self.updated_at = datetime.utcnow()
        else:
            raise BusinessRuleViolation("Cannot activate non-suspended account")
    
    def suspend(self, reason: str) -> None:
        """Suspendre le compte client."""
        if self.status == CustomerAccountStatus.ACTIVE:
            self.status = CustomerAccountStatus.SUSPENDED
            self.updated_at = datetime.utcnow()
            # Émettre événement de suspension
        else:
            raise BusinessRuleViolation("Cannot suspend non-active account")
```

**Propriétés :**
- `id` : Identifiant unique UUID
- `name` : Nom du tenant (validé)
- `email` : Email administrateur (validé)
- `status` : État actuel du compte
- `created_at` : Date de création
- `updated_at` : Dernière modification

**Comportements :**
- `activate()` : Activation du compte
- `suspend()` : Suspension du compte
- `is_active` : Propriété calculée
- `can_create_database()` : Vérification des permissions

### `CustomerAccountStatus`

**Énumération** des états possibles d'un compte client.

```python
class CustomerAccountStatus(Enum):
    """États possibles d'un compte client."""
    
    PENDING = "pending"       # En attente d'activation
    ACTIVE = "active"         # Actif et opérationnel
    SUSPENDED = "suspended"   # Suspendu temporairement
    TERMINATED = "terminated" # Fermé définitivement
```

**Transitions d'états :**
```
PENDING → ACTIVE     (activation initiale)
ACTIVE → SUSPENDED   (suspension temporaire)
SUSPENDED → ACTIVE   (réactivation)
ACTIVE → TERMINATED  (fermeture définitive)
SUSPENDED → TERMINATED (fermeture après suspension)
```

## 🏭 Factory Methods

### `CustomerAccount.create_new()`

**Factory method** pour créer un nouveau compte client avec validation complète.

```python
@classmethod
def create_new(
    cls,
    tenant_name: str,
    admin_email: str,
    organization_name: Optional[str] = None,
) -> 'CustomerAccount':
    """
    Créer un nouveau compte client.
    
    Args:
        tenant_name: Nom unique du tenant
        admin_email: Email de l'administrateur
        organization_name: Nom optionnel de l'organisation
        
    Returns:
        Nouveau compte client en statut PENDING
        
    Raises:
        ValidationError: Si les données ne sont pas valides
    """
    # Validation et création des value objects
    tenant_name_vo = TenantName(tenant_name)
    admin_email_vo = EmailAddress(admin_email)
    
    # Créer l'entité
    return cls(
        id=EntityId(),
        name=tenant_name_vo,
        email=admin_email_vo,
        status=CustomerAccountStatus.PENDING,
    )
```

### `CustomerAccount.from_repository()`

**Factory method** pour reconstruire depuis les données persistées.

```python
@classmethod
def from_repository(
    cls,
    id: UUID,
    name: str,
    email: str,
    status: str,
    created_at: datetime,
    updated_at: Optional[datetime] = None,
) -> 'CustomerAccount':
    """Reconstruire depuis les données de repository."""
    return cls(
        id=EntityId(id),
        name=TenantName(name),
        email=EmailAddress(email),
        status=CustomerAccountStatus(status),
        created_at=created_at,
        updated_at=updated_at,
    )
```

## 🔧 Règles Métier

### 1. Unicité du Tenant
```python
def validate_tenant_uniqueness(tenant_name: TenantName, repository: TenantRepository) -> None:
    """Valider l'unicité du nom de tenant."""
    existing = repository.find_by_tenant_name(tenant_name)
    if existing:
        raise BusinessRuleViolation(f"Tenant '{tenant_name}' already exists")
```

### 2. Validation de l'Email
```python
def validate_admin_email(email: EmailAddress) -> None:
    """Valider l'email administrateur."""
    # L'email est déjà validé par le Value Object EmailAddress
    # Règles additionnelles si nécessaires (domaines autorisés, etc.)
    pass
```

### 3. Transitions d'État
```python
def can_transition_to(self, new_status: CustomerAccountStatus) -> bool:
    """Vérifier si la transition d'état est autorisée."""
    valid_transitions = {
        CustomerAccountStatus.PENDING: [CustomerAccountStatus.ACTIVE],
        CustomerAccountStatus.ACTIVE: [CustomerAccountStatus.SUSPENDED, CustomerAccountStatus.TERMINATED],
        CustomerAccountStatus.SUSPENDED: [CustomerAccountStatus.ACTIVE, CustomerAccountStatus.TERMINATED],
        CustomerAccountStatus.TERMINATED: [],  # État final
    }
    
    return new_status in valid_transitions.get(self.status, [])
```

## 🎭 Behaviors (Méthodes Métier)

### Gestion du Cycle de Vie

```python
def activate(self) -> None:
    """Activer le compte."""
    if not self.can_transition_to(CustomerAccountStatus.ACTIVE):
        raise BusinessRuleViolation(
            f"Cannot activate account in {self.status.value} status"
        )
    
    self.status = CustomerAccountStatus.ACTIVE
    self.updated_at = datetime.utcnow()
    
    # Émettre événement domaine
    self._emit_event(CustomerActivatedEvent(
        customer_id=self.id.value,
        tenant_name=self.name.value,
        activated_at=self.updated_at,
    ))

def suspend(self, reason: str) -> None:
    """Suspendre le compte."""
    if not self.can_transition_to(CustomerAccountStatus.SUSPENDED):
        raise BusinessRuleViolation(
            f"Cannot suspend account in {self.status.value} status"
        )
    
    self.status = CustomerAccountStatus.SUSPENDED
    self.updated_at = datetime.utcnow()
    
    # Émettre événement domaine
    self._emit_event(CustomerSuspendedEvent(
        customer_id=self.id.value,
        tenant_name=self.name.value,
        reason=reason,
        suspended_at=self.updated_at,
    ))
```

### Propriétés Calculées

```python
@property
def is_active(self) -> bool:
    """Le compte est-il actif ?"""
    return self.status == CustomerAccountStatus.ACTIVE

@property
def is_suspended(self) -> bool:
    """Le compte est-il suspendu ?"""
    return self.status == CustomerAccountStatus.SUSPENDED

@property
def can_create_databases(self) -> bool:
    """Peut créer des bases de données ?"""
    return self.is_active

@property
def age_in_days(self) -> int:
    """Âge du compte en jours."""
    return (datetime.utcnow() - self.created_at).days
```

## 🧪 Tests

### Tests d'Entité

```python
class TestCustomerAccount:
    """Tests de l'entité CustomerAccount."""
    
    def test_create_new_customer(self):
        """Test création nouveau customer."""
        customer = CustomerAccount.create_new(
            tenant_name="test-company",
            admin_email="admin@test.com"
        )
        
        assert customer.name.value == "test-company"
        assert customer.email.value == "admin@test.com"
        assert customer.status == CustomerAccountStatus.PENDING
        assert customer.id is not None
    
    def test_activate_pending_customer(self):
        """Test activation customer pending."""
        customer = CustomerAccount.create_new("test", "test@test.com")
        
        customer.activate()
        
        assert customer.status == CustomerAccountStatus.ACTIVE
        assert customer.updated_at is not None
    
    def test_cannot_activate_active_customer(self):
        """Test qu'on ne peut pas activer un customer déjà actif."""
        customer = CustomerAccount.create_new("test", "test@test.com")
        customer.activate()
        
        with pytest.raises(BusinessRuleViolation):
            customer.activate()
    
    def test_suspend_active_customer(self):
        """Test suspension customer actif."""
        customer = CustomerAccount.create_new("test", "test@test.com")
        customer.activate()
        
        customer.suspend("Payment overdue")
        
        assert customer.status == CustomerAccountStatus.SUSPENDED
        assert customer.updated_at is not None
```

### Tests de Règles Métier

```python
def test_tenant_name_validation():
    """Test validation du nom de tenant."""
    # Valid
    customer = CustomerAccount.create_new("valid-name", "test@test.com")
    assert customer.name.value == "valid-name"
    
    # Invalid - trop court
    with pytest.raises(ValidationError):
        CustomerAccount.create_new("ab", "test@test.com")
    
    # Invalid - caractères invalides
    with pytest.raises(ValidationError):
        CustomerAccount.create_new("invalid@name", "test@test.com")

def test_email_validation():
    """Test validation de l'email."""
    # Valid
    customer = CustomerAccount.create_new("test", "valid@email.com")
    assert customer.email.value == "valid@email.com"
    
    # Invalid
    with pytest.raises(ValidationError):
        CustomerAccount.create_new("test", "invalid-email")
```

## 📊 Événements du Domaine

### `CustomerRegisteredEvent`
```python
@dataclass(frozen=True)
class CustomerRegisteredEvent(DomainEvent):
    """Événement : nouveau customer enregistré."""
    customer_id: UUID
    tenant_name: str
    admin_email: str
    organization_name: Optional[str] = None
```

### `CustomerActivatedEvent`
```python
@dataclass(frozen=True)
class CustomerActivatedEvent(DomainEvent):
    """Événement : customer activé."""
    customer_id: UUID
    tenant_name: str
    activated_at: datetime
```

### `CustomerSuspendedEvent`
```python
@dataclass(frozen=True)
class CustomerSuspendedEvent(DomainEvent):
    """Événement : customer suspendu."""
    customer_id: UUID
    tenant_name: str
    reason: str
    suspended_at: datetime
```

## 🚀 Évolution Future

### Fonctionnalités Potentielles

#### Subscription Management
```python
@dataclass
class SubscriptionPlan:
    """Plan d'abonnement."""
    name: str
    max_databases: int
    max_concurrent_queries: int
    storage_quota_gb: float
    price_monthly: Decimal

# Ajout à CustomerAccount
subscription_plan: Optional[SubscriptionPlan] = None
```

#### Usage Tracking
```python
def track_database_creation(self) -> None:
    """Tracker la création d'une base."""
    self.database_count += 1
    if self.database_count > self.subscription_plan.max_databases:
        raise QuotaExceededError("Database limit reached")
```

#### Billing Integration
```python
def calculate_monthly_bill(self) -> Decimal:
    """Calculer la facture mensuelle."""
    base_cost = self.subscription_plan.price_monthly
    overage_cost = self._calculate_overage_costs()
    return base_cost + overage_cost
```

### Domain Services

```python
class CustomerDomainService:
    """Service du domaine pour logique inter-entités."""
    
    def can_upgrade_subscription(
        self, customer: CustomerAccount, new_plan: SubscriptionPlan
    ) -> bool:
        """Vérifier si l'upgrade est possible."""
        return (
            customer.is_active and
            new_plan.max_databases >= customer.database_count
        )
    
    def transfer_tenant_ownership(
        self, from_customer: CustomerAccount, to_customer: CustomerAccount
    ) -> None:
        """Transférer la propriété d'un tenant."""
        # Logique complexe de transfert
        pass
```

## 💡 Bonnes Pratiques

### 1. Immutabilité des Value Objects
```python
# Les propriétés utilisant des Value Objects sont immutables
customer.name = TenantName("new-name")  # ✅ Remplace l'objet entier
customer.name.value = "new-name"        # ❌ Impossible (frozen=True)
```

### 2. Validation dans les Factory Methods
```python
@classmethod
def create_new(cls, tenant_name: str, admin_email: str) -> 'CustomerAccount':
    """Toute la validation se fait ici."""
    # Validation des Value Objects + règles métier
    tenant_name_vo = TenantName(tenant_name)  # Peut lever ValidationError
    admin_email_vo = EmailAddress(admin_email)  # Peut lever ValidationError
    
    # Règles métier additionnelles
    cls._validate_business_rules(tenant_name_vo, admin_email_vo)
    
    return cls(...)
```

### 3. Séparation État/Comportement
```python
# ✅ Bon : logique métier dans l'entité
def suspend(self, reason: str) -> None:
    """Logique de suspension dans l'entité."""
    if not self.can_be_suspended():
        raise BusinessRuleViolation("Cannot suspend")
    self.status = CustomerAccountStatus.SUSPENDED

# ❌ Éviter : logique dans les services d'application
def suspend_customer(customer_id: UUID, reason: str) -> None:
    """Logique métier dans le service."""
    customer = repository.find(customer_id)
    if customer.status == CustomerAccountStatus.ACTIVE:  # Logique métier
        customer.status = CustomerAccountStatus.SUSPENDED
```

---

**Principe clé** : L'entité `CustomerAccount` encapsule **toute la logique métier** liée aux comptes clients, garantissant la **cohérence** et l'**intégrité** des données.