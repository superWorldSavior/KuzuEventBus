# Application Layer - Use Cases & Orchestration

L'**orchestrateur** qui coordonne la logique métier pour réaliser les **cas d'usage** concrets du système.

## 🎯 Quels problèmes on résout ?

### Use Case 1: Customer Self-Service Onboarding
**Business Problem:** Les développeurs veulent commencer à utiliser Kuzu rapidement sans passer par la sales.

**Notre Solution:**
```
Developer lands on site → Fill form → Email confirmation → Start using API
                           ↓
                    [Validation + Account Creation + API Key]
```

**Orchestration Steps:**
1. Valider les données d'entrée (format, unicité)
2. Créer le compte customer en statut PENDING
3. Générer la première API key
4. Envoyer l'email de bienvenue
5. Cacher les infos pour l'accès rapide

### Use Case 2: Tenant Account Management
**Business Problem:** Comment gérer le cycle de vie des comptes (activation, suspension, etc.) ?

**Flows d'Administration:**
```
Payment Success → Activate Account → Enable full features
Payment Failed → Suspend Account → Read-only mode
Account Closure → Terminate Account → Data cleanup
```

### Use Case 3: API Key Management (Future)
**Business Problem:** Les équipes ont besoin de plusieurs clés pour différents environnements.

**Tenant Self-Service:**
```
Dev team → Create key "production" → Set permissions → Get key
Dev team → Revoke key "old-staging" → Key invalidated
Admin → List all keys → Audit access
```

## 🔄 Flow Orchestration

### Customer Registration Flow
```
HTTP Request → DTO Validation → Business Validation → Domain Logic → Infrastructure Calls → Response

Detailed Steps:
1. CustomerRegistrationRequest (Pydantic validation)
2. Check tenant name uniqueness (Repository)
3. Create CustomerAccount entity (Domain)
4. Generate API key (Auth Service)
5. Save account (Repository)
6. Send welcome email (Notification)
7. Cache for quick access (Cache)
8. Return CustomerRegistrationResponse
```

### Error Handling Strategy
```
Validation Error → 400 Bad Request (user fix needed)
Business Rule Violation → 409 Conflict (duplicate tenant)
Infrastructure Error → 500 Internal Error (retry later)
```

### Async Coordination
```
Critical Path: Account Creation + API Key (blocking)
Background: Email Sending + Caching (async, can fail)

Result: User gets immediate response, notifications best-effort
```

## 📋 Service Responsibilities

### CustomerAccountService
**What it orchestrates:**
- Registration workflow end-to-end
- Account lifecycle transitions
- Cross-service coordination (auth + notifications + cache)

**What it doesn't do:**
- Direct database access (uses Repository)
- Email template rendering (uses NotificationService)
- API key cryptography (uses AuthService)

### DatabaseManagementService (Future)
**Business Flows:**
```
Create Database → Validate name → Check quotas → Create in Kuzu → Update permissions
Delete Database → Confirm request → Backup data → Remove from Kuzu → Clean permissions
```

### QueryExecutionService (Future)  
**Business Flows:**
```
Execute Query → Authenticate → Check permissions → Rate limit → Execute → Cache result → Return
```

## 🎭 Business Scenarios

### Scenario: Happy Path Registration
```
1. Developer visits /register
2. Fills: tenant="cool-startup", email="dev@cool.com", org="Cool Startup"
3. System validates (format OK, tenant available)
4. Creates CustomerAccount(status=PENDING)
5. Generates API key "kuzu_abc123..."
6. Sends welcome email (async)
7. Caches account info
8. Returns: customer_id + api_key + instructions
```

### Scenario: Duplicate Tenant Name
```
1. Developer tries tenant="existing-company"
2. System checks uniqueness → FOUND existing
3. Returns 409 Conflict: "Tenant name already taken"
4. Frontend suggests alternatives: "existing-company-2", "existing-company-dev"
```

### Scenario: Email Service Down
```
1. Registration proceeds normally
2. Account created, API key generated
3. Email service fails → Log error, continue
4. Return success to user
5. Background job retries email later
Result: User not blocked by email issues
```

## 🔧 Data Transformation Patterns

### Request → Domain
```
CustomerRegistrationRequest (HTTP/JSON)
     ↓ [validation + conversion]
TenantName + EmailAddress (Domain Value Objects)
     ↓ [business logic]
CustomerAccount (Domain Entity)
```

### Domain → Response
```
CustomerAccount (Domain Entity)
     ↓ [extract data]
Dict[str, Any] (Service Result)
     ↓ [format for API]
CustomerRegistrationResponse (HTTP/JSON)
```

### Error Transformation
```
ValidationError (Domain) → 400 Bad Request (HTTP)
BusinessRuleViolation (Domain) → 409 Conflict (HTTP)
InfrastructureException (Services) → 500 Internal Error (HTTP)
```

## 🗂️ Inventaire des Use Cases (MVP actuel)

- **RegisterCustomerUseCase** (`register_customer.py`)
  - Entrée: `{ tenant_name, organization_name, admin_email }`
  - Sortie: `{ customer_id, tenant_name, api_key, subscription_status, created_at }`
  - Ports: `CustomerAccountRepository`, `AuthenticationService`, `NotificationService`, `CacheService`

- **ListCustomerApiKeysUseCase** (`list_customer_api_keys.py`)
  - Entrée: `{ customer_id }`
  - Sortie: `[{ api_key, created_at, status }]`
  - Ports: `CustomerAccountRepository`, `AuthenticationService`

- **RevokeCustomerApiKeyUseCase** (`revoke_customer_api_key.py`)
  - Entrée: `{ customer_id, api_key }`
  - Sortie: `{ revoked: bool }`
  - Ports: `CustomerAccountRepository`, `AuthenticationService`

- **ProvisionTenantResourcesUseCase** (`provision_tenant_resources.py`)
  - Entrée: `{ tenant_id, database_name }`
  - Sortie: `{ tenant_id, bucket, database_name, database_id, filesystem_path, created_at }`
  - Ports: `BucketProvisioningService`, `DatabaseProvisioningService`, `DatabaseMetadataRepository`

- **GetKuzuDatabaseInfoUseCase** (`get_kuzu_database_info.py`)
  - Entrée: `{ tenant_id, database_id }`
  - Sortie: `dict` (métadonnées + infos runtime selon adapter)
  - Ports: `AuthorizationService`, `KuzuDatabaseRepository`, `KuzuQueryService`, `CacheService`

- **DeleteKuzuDatabaseUseCase** (`delete_kuzu_database.py`)
  - Entrée: `{ tenant_id, database_id }`
  - Sortie: `{ deleted: bool }`
  - Ports: `AuthorizationService`, `KuzuDatabaseRepository`, `FileStorageService`, `CacheService`, `NotificationService`

- **UploadKuzuDatabaseFileUseCase** (`upload_kuzu_database_file.py`)
  - Entrée: `{ tenant_id, database_id, file_name, file_content }`
  - Sortie: `{ file_path, file_size, uploaded_at, upload_url? }`
  - Ports: `AuthorizationService`, `KuzuDatabaseRepository`, `FileStorageService`, `CacheService`, `NotificationService`

- **CreateDatabaseSnapshotUseCase** (`create_database_snapshot.py`)
  - Entrée: `{ tenant_id, database_id }`
  - Sortie: `{ snapshot_id, object_key, checksum, size_bytes, created_at }`
  - Ports: `AuthorizationService`, `KuzuDatabaseRepository`, `FileStorageService`, `SnapshotRepository`, `DistributedLockService`, `CacheService`

- **ListDatabaseSnapshotsUseCase** (`list_database_snapshots.py`)
  - Entrée: `{ tenant_id, database_id }`
  - Sortie: `[{ id, object_key, checksum, size_bytes, created_at }]`
  - Ports: `AuthorizationService`, `SnapshotRepository`

- **RestoreDatabaseFromSnapshotUseCase** (`restore_database_from_snapshot.py`)
  - Entrée: `{ tenant_id, database_id, snapshot_id }`
  - Sortie: `{ restored, database_id, mode, restored_at }`
  - Ports: `AuthorizationService`, `KuzuDatabaseRepository`, `SnapshotRepository`, `FileStorageService`, `DistributedLockService`, `CacheService`

- **SubmitAsyncQueryUseCase** (`submit_async_query.py`)
  - Entrée: `{ tenant_id, database_id, query, parameters, timeout_seconds, priority }`
  - Sortie: `{ transaction_id }`
  - Ports: `MessageQueueService`, `TransactionRepository`, `QueryCatalogRepository`
  - Notes: Incrémente l'usage de la requête (catalogue) au moment de la soumission
    (normalisation + hash). Opération non bloquante (fail-fast) qui n'empêche pas la
    création du job en cas d'échec d'écriture catalogue.

### Query Catalog – Popular & Favorites

- **ListPopularQueriesUseCase** (orchestration simple via routes)
  - Entrée: `{ tenant_id, database_id, limit=10 }`
  - Sortie: `[{ query_hash, query_text, usage_count, last_used_at }]`
  - Ports: `QueryCatalogRepository`
  - Règles: Exclut les favoris du classement (filtrage SQL côté adapter)

- **ListFavoriteQueriesUseCase** (orchestration simple via routes)
  - Entrée: `{ tenant_id, database_id }`
  - Sortie: `[{ query_hash, query_text, created_at }]`
  - Ports: `QueryCatalogRepository`

- **AddFavoriteQueryUseCase** (orchestration simple via routes)
  - Entrée: `{ tenant_id, database_id, query }`
  - Sortie: `{ query_hash, query_text, created_at }`
  - Ports: `QueryCatalogRepository`
  - Règles: Normalisation du texte + hash stable; maximum 10 favoris par base
    (sinon `BusinessRuleViolation`)

- **RemoveFavoriteQueryUseCase** (orchestration simple via routes)
  - Entrée: `{ tenant_id, database_id, query_hash }`
  - Sortie: `{ removed: bool }`
  - Ports: `QueryCatalogRepository`
  - Règles: Suppression idempotente (retourne `removed=false` si absent)

## 🚀 Evolution Strategy

### Current (YAGNI): Simple Orchestration
```
Single-service calls:
✅ Create account
✅ Generate API key  
✅ Send notification
✅ Cache result
```

### Phase 2: Enhanced Workflows
```
Multi-step processes:
🔄 Email confirmation required
🔄 Admin approval workflow
🔄 Payment processing integration
```

### Phase 3: Advanced Orchestration
```
Saga patterns:
📋 Cross-tenant data sharing
📋 Complex billing calculations
📋 Multi-region deployments
```

## 💡 Business Logic vs Technical Logic

### Business Logic (Domain Layer)
```
✅ "Tenant names must be unique"
✅ "Only active accounts can create databases"
✅ "Suspended accounts become read-only"
```

### Orchestration Logic (Application Layer)
```
✅ "Send welcome email after account creation"
✅ "Cache account data for 1 hour"
✅ "Retry failed notifications 3 times"
```

### Technical Logic (Infrastructure Layer)
```
✅ "Store in PostgreSQL vs Memory"
✅ "Send email via SMTP vs SendGrid"
✅ "Cache in Redis vs Memory"
```

## 🧪 Testing Strategy

### Integration Tests Focus
```
Test Complete Flows:
✅ End-to-end registration success
✅ Duplicate tenant handling
✅ Service failure scenarios
✅ Performance under load
```

### Mock Strategy
```
Mock Infrastructure:
✅ Repository (data layer)
✅ NotificationService (external calls)
✅ AuthService (security)

Don't Mock:
❌ Domain objects (test real business logic)
❌ DTOs (test real validation)
```

### Business Scenario Tests
```python
async def test_customer_registration_happy_path():
    """Test the complete happy path business scenario."""
    # Arrange: Clean state
    # Act: Full registration flow
    # Assert: All expected side effects occurred
    
async def test_duplicate_tenant_rejection():
    """Test business rule: tenant uniqueness."""
    # Arrange: Existing tenant
    # Act: Try duplicate registration
    # Assert: Proper business error
```

---

**Principe clé** : L'application layer **orchestre** sans contenir de logique métier, garantissant que les **cas d'usage business** sont correctement réalisés.