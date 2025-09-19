# Domain Ports

**Interfaces** (contrats) qui définissent les services externes dont le domaine a besoin, suivant le principe d'**inversion de dépendance**.

## 🏗️ Structure

```
ports/
├── authentication.py       # Service d'authentification et API keys
├── cache.py                # Service de cache distribué
├── database_management.py  # Gestion des bases de données Kuzu
├── notifications.py        # Service de notifications
├── query_execution.py      # Exécution de requêtes Cypher
└── tenant_management.py    # Repository pour les tenants
```

## 🎯 Philosophie des Ports

### Inversion de Dépendance
**Le domaine définit ses besoins** sans connaître l'implémentation :

```python
# ✅ Domaine définit l'interface
class AuthenticationService(Protocol):
    async def generate_api_key(...) -> str: ...

# ✅ Infrastructure implémente
class SimpleAuthService(AuthenticationService):
    async def generate_api_key(...) -> str:
        return f"kuzu_{uuid4()}"

# ✅ Application utilise l'interface
class CustomerService:
    def __init__(self, auth_service: AuthenticationService): ...
```

### Avantages
- 🔄 **Flexibilité** : changement d'implémentation sans impact domaine
- 🧪 **Testabilité** : interfaces facilement mockables
- 📝 **Contrats clairs** : APIs explicites et documentées
- 🏗️ **Architecture** : séparation domaine/infrastructure

## 📦 Ports Disponibles

### `AuthenticationService`

**Service d'authentification et gestion des API keys**

```python
@runtime_checkable
class AuthenticationService(Protocol):
    """Service d'authentification et gestion des clés API."""

    async def authenticate_api_key(self, api_key: str) -> bool:
        """
        Authentifier une clé API.
        
        Args:
            api_key: Clé API à vérifier
            
        Returns:
            True si la clé est valide et active
        """
        ...

    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        """
        Générer une nouvelle clé API pour un tenant.
        
        Args:
            tenant_id: Identifiant du tenant
            key_name: Nom descriptif de la clé
            permissions: Liste des permissions accordées
            
        Returns:
            Clé API générée
        """
        ...

    async def revoke_api_key(self, api_key: str) -> bool:
        """
        Révoquer une clé API.
        
        Args:
            api_key: Clé à révoquer
            
        Returns:
            True si la révocation a réussi
        """
        ...

    async def list_api_keys(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """
        Lister toutes les clés API d'un tenant.
        
        Args:
            tenant_id: Identifiant du tenant
            
        Returns:
            Liste des clés avec métadonnées
        """
        ...
```

**Implémentations :**
- `SimpleAuthService` (YAGNI) : Authentification toujours réussie
- `JWTAuthService` (future) : Tokens JWT avec validation
- `DatabaseAuthService` (future) : Stockage en base

### `NotificationService`

**Service de notifications multi-canal**

```python
@runtime_checkable
class NotificationService(Protocol):
    """Service de notifications (email, SMS, push, etc.)."""

    async def send_notification(
        self,
        tenant_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        recipients: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Envoyer une notification.
        
        Args:
            tenant_id: Identifiant du tenant
            notification_type: Type de notification (welcome, alert, etc.)
            title: Titre de la notification
            message: Contenu du message
            recipients: Destinataires spécifiques (optionnel)
            metadata: Métadonnées additionnelles
            
        Returns:
            True si l'envoi a réussi
        """
        ...

    async def send_email(
        self,
        to_email: str,
        subject: str,
        content: str,
        content_type: str = "text/plain",
    ) -> bool:
        """
        Envoyer un email spécifique.
        
        Args:
            to_email: Adresse destinataire
            subject: Sujet de l'email
            content: Contenu du message
            content_type: Type de contenu (text/plain, text/html)
            
        Returns:
            True si l'envoi a réussi
        """
        ...
```

**Implémentations :**
- `InMemoryNotificationService` (YAGNI) : Affichage console
- `SMTPNotificationService` (future) : Envoi email SMTP
- `SendGridNotificationService` (future) : API SendGrid

### `CacheService`

**Service de cache distribué**

```python
@runtime_checkable
class CacheService(Protocol):
    """Service de cache avec TTL et patterns distribués."""

    async def get(self, key: str) -> Optional[Any]:
        """
        Récupérer une valeur du cache.
        
        Args:
            key: Clé de cache
            
        Returns:
            Valeur si trouvée, None sinon
        """
        ...

    async def set(
        self, key: str, value: Any, expire_seconds: Optional[int] = None
    ) -> bool:
        """
        Stocker une valeur dans le cache.
        
        Args:
            key: Clé de cache
            value: Valeur à stocker
            expire_seconds: TTL en secondes (optionnel)
            
        Returns:
            True si le stockage a réussi
        """
        ...

    async def delete(self, key: str) -> bool:
        """
        Supprimer une entrée du cache.
        
        Args:
            key: Clé à supprimer
            
        Returns:
            True si la suppression a réussi
        """
        ...

    async def exists(self, key: str) -> bool:
        """
        Vérifier l'existence d'une clé.
        
        Args:
            key: Clé à vérifier
            
        Returns:
            True si la clé existe
        """
        ...
```

**Implémentations :**
- `RedisCacheService` : Cache Redis distribué (production)
- `InMemoryCacheService` (doc/tests) : Exemple en mémoire

### `TenantRepository`

**Repository pour la persistance des tenants**

```python
@runtime_checkable
class TenantRepository(Protocol):
    """Repository pour la gestion des comptes clients."""

    async def save(self, account: CustomerAccount) -> None:
        """
        Sauvegarder un compte client.
        
        Args:
            account: Compte à sauvegarder
        """
        ...

    async def find_by_id(self, account_id: EntityId) -> Optional[CustomerAccount]:
        """
        Trouver un compte par ID.
        
        Args:
            account_id: Identifiant du compte
            
        Returns:
            Compte trouvé ou None
        """
        ...

    async def find_by_tenant_name(
        self, tenant_name: TenantName
    ) -> Optional[CustomerAccount]:
        """
        Trouver un compte par nom de tenant.
        
        Args:
            tenant_name: Nom du tenant
            
        Returns:
            Compte trouvé ou None
        """
        ...

    async def find_by_email(
        self, email: EmailAddress
    ) -> Optional[CustomerAccount]:
        """
        Trouver un compte par email.
        
        Args:
            email: Email administrateur
            
        Returns:
            Compte trouvé ou None
        """
        ...

    async def list_all(
        self, limit: int = 100, offset: int = 0
    ) -> List[CustomerAccount]:
        """
        Lister tous les comptes avec pagination.
        
        Args:
            limit: Nombre maximum de résultats
            offset: Décalage pour la pagination
            
        Returns:
            Liste des comptes
        """
        ...

    async def delete(self, account_id: EntityId) -> bool:
        """
        Supprimer un compte (soft delete recommandé).
        
        Args:
            account_id: Identifiant du compte
            
        Returns:
            True si la suppression a réussi
        """
        ...
```

**Implémentations :**
- `PostgresCustomerAccountRepository` : implémentation production (obligatoire)
- `InMemoryTenantRepository` : conservé pour tests/examples seulement
- `MongoTenantRepository` : (future) Base MongoDB

## 🔮 Ports Futurs

### `DatabaseManagementService`

**Gestion des bases de données Kuzu**

```python
@runtime_checkable
class DatabaseManagementService(Protocol):
    """Service de gestion des bases de données Kuzu."""

    async def create_database(
        self, tenant_id: UUID, db_name: str, schema: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Créer une nouvelle base de données."""
        ...

    async def delete_database(
        self, tenant_id: UUID, db_name: str
    ) -> bool:
        """Supprimer une base de données."""
        ...

    async def list_databases(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """Lister les bases de données d'un tenant."""
        ...
```

### `QueryExecutionService`

**Exécution de requêtes Cypher**

```python
@runtime_checkable
class QueryExecutionService(Protocol):
    """Service d'exécution de requêtes Cypher."""

    async def execute_query(
        self, tenant_id: UUID, database: str, query: str, parameters: Dict = None
    ) -> Dict[str, Any]:
        """Exécuter une requête Cypher."""
        ...

    async def explain_query(
        self, tenant_id: UUID, database: str, query: str
    ) -> Dict[str, Any]:
        """Expliquer le plan d'exécution."""
        ...
```

### `FileStorageService`

**Stockage de fichiers distribué**

```python
@runtime_checkable
class FileStorageService(Protocol):
    """Service de stockage de fichiers."""

    async def upload_file(
        self, tenant_id: UUID, file_path: str, content: bytes
    ) -> str:
        """Upload un fichier et retourne l'URL."""
        ...

    async def download_file(
        self, tenant_id: UUID, file_url: str
    ) -> bytes:
        """Télécharger un fichier."""
        ...
```

## 🧪 Testing des Ports

### Contract Testing

```python
class TestAuthenticationServiceContract:
    """Tests du contrat AuthenticationService."""
    
    @pytest.fixture(params=[
        SimpleAuthService(),
        # JWTAuthService(),  # Quand disponible
        # DatabaseAuthService(),  # Quand disponible
    ])
    def auth_service(self, request):
        """Parameterized fixture pour tester toutes les implémentations."""
        return request.param
    
    @pytest.mark.asyncio
    async def test_generate_api_key_returns_string(self, auth_service):
        """Test que generate_api_key retourne une string."""
        api_key = await auth_service.generate_api_key(
            tenant_id=uuid4(),
            key_name="test-key",
            permissions=["read"]
        )
        
        assert isinstance(api_key, str)
        assert len(api_key) > 0
    
    @pytest.mark.asyncio
    async def test_authenticate_api_key_returns_bool(self, auth_service):
        """Test que authenticate_api_key retourne un bool."""
        result = await auth_service.authenticate_api_key("test-key")
        assert isinstance(result, bool)
```

### Mock Implementations

```python
class MockAuthService(AuthenticationService):
    """Mock pour les tests."""
    
    def __init__(self):
        self.generated_keys: List[str] = []
        self.revoked_keys: Set[str] = set()
    
    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        key = f"mock_key_{len(self.generated_keys)}"
        self.generated_keys.append(key)
        return key
    
    async def authenticate_api_key(self, api_key: str) -> bool:
        return api_key in self.generated_keys and api_key not in self.revoked_keys
```

## 🔧 Patterns d'Implémentation

### 1. Adaptateur Simple (YAGNI)

```python
class SimpleNotificationService(NotificationService):
    """Implémentation YAGNI - console uniquement."""
    
    async def send_notification(
        self, tenant_id: UUID, notification_type: str, title: str, message: str, **kwargs
    ) -> bool:
        print(f"📧 {notification_type}: {title} -> {message}")
        return True  # Toujours réussir pour YAGNI
```

### 2. Adaptateur Complexe (Future)

```python
class SMTPNotificationService(NotificationService):
    """Implémentation SMTP complète."""
    
    def __init__(self, smtp_config: SMTPConfig):
        self._smtp = aiosmtplib.SMTP(**smtp_config.dict())
        self._template_engine = Jinja2Templates("templates/")
    
    async def send_notification(
        self, tenant_id: UUID, notification_type: str, title: str, message: str, **kwargs
    ) -> bool:
        try:
            # Rendu du template
            content = await self._template_engine.render(
                f"{notification_type}.html",
                title=title,
                message=message,
                **kwargs
            )
            
            # Envoi email
            await self._smtp.send_message(...)
            return True
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False
```

### 3. Adaptateur avec Retry

```python
class RetryableAuthService(AuthenticationService):
    """Adaptateur avec retry automatique."""
    
    def __init__(self, base_service: AuthenticationService):
        self._base = base_service
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        return await self._base.generate_api_key(tenant_id, key_name, permissions)
```

## 💡 Bonnes Pratiques

### 1. Interface Segregation

```python
# ✅ Bon : interfaces focalisées
class EmailService(Protocol):
    async def send_email(...): ...

class SMSService(Protocol):
    async def send_sms(...): ...

# ❌ Éviter : interface trop large
class CommunicationService(Protocol):
    async def send_email(...): ...
    async def send_sms(...): ...
    async def send_push(...): ...
    async def make_phone_call(...): ...  # Trop de responsabilités
```

### 2. Évolutivité des Signatures

```python
# ✅ Bon : paramètres extensibles
async def send_notification(
    self,
    tenant_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,  # Extensible
) -> bool:

# ❌ Éviter : signature figée
async def send_notification(
    self, tenant_id: UUID, title: str, message: str
) -> bool:  # Difficile à étendre
```

### 3. Documentation Complète

```python
async def execute_query(
    self, tenant_id: UUID, database: str, query: str, parameters: Dict = None
) -> Dict[str, Any]:
    """
    Exécuter une requête Cypher sur une base de données.
    
    Args:
        tenant_id: Identifiant du tenant propriétaire
        database: Nom de la base de données cible
        query: Requête Cypher à exécuter
        parameters: Paramètres de la requête (optionnel)
        
    Returns:
        Dict contenant:
        - results: Liste des résultats
        - execution_time_ms: Temps d'exécution
        - rows_affected: Nombre de lignes affectées
        
    Raises:
        QuerySyntaxError: Si la requête est invalide
        DatabaseNotFoundError: Si la base n'existe pas
        PermissionDeniedError: Si le tenant n'a pas les droits
    """
```

---

**Principe clé** : Les ports définissent **ce dont le domaine a besoin** de l'infrastructure, permettant une **architecture flexible** et **facilement testable**.
