# API Layer - Developer Experience & Business Value

L'**interface publique** qui expose la valeur business aux développeurs utilisateurs de notre service.

## 🎯 Valeur Business de l'API

### Pour les Développeurs Clients
**Problème résolu :** "Comment intégrer Kuzu dans mon app sans devenir expert en graph databases ?"

**Notre solution :**
- **Onboarding en 5 minutes** : Registration → API key → First query
- **Documentation interactive** : Swagger UI pour tester directement
- **Error messages clairs** : Pas de cryptic database errors
- **Standards REST** : Patterns familiers, pas de magie

### Pour les Product Teams
**Problème résolu :** "Comment monitorer et gérer l'usage de nos bases graphes ?"

**Capabilities :**
- **Multi-tenant par design** : Isolation garantie entre projets
- **API-first approach** : Intégration dans tous les workflows
- **Self-service onboarding** : Pas de tickets support pour démarrer
- **Built-in monitoring** : Health checks pour vos load balancers

## 🚀 Developer Journey

### Journey 1: First-Time User
```
1. Developer hears about Kuzu Event Bus
2. Visits /docs → Sees interactive API documentation
3. Clicks "Try Registration" → Fills basic info
4. Gets API key instantly → No waiting for approval
5. Makes first API call → Success in < 5 minutes
6. Integrates in their app → Production-ready
```

### Journey 2: Team Scaling
```
1. Individual dev successful with prototype
2. Team wants separate environments (dev/staging/prod)
3. Registers multiple tenants: "company-dev", "company-prod"
4. Each environment = isolated data + separate API keys
5. Team collaborates without data conflicts
```

### Journey 3: Production Operations
```
1. App goes to production with real users
2. Monitoring integration via /health endpoints
3. Load balancers route traffic based on health status
4. Ops team gets visibility without learning Kuzu internals
```

## 🌐 API Value Proposition

### `/api/v1/customers/register` - Self-Service Onboarding
**Business Value :** Eliminates sales friction, enables product-led growth

**Developer Experience :**
```bash
curl -X POST /api/v1/customers/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_name": "my-startup", 
    "organization_name": "My Startup Inc",
    "admin_email": "dev@mystartup.com"
  }'

Response:
{
  "customer_id": "uuid-here",
  "tenant_name": "my-startup", 
  "api_key": "kuzu_abc123...",
  "subscription_status": "active"
}
```

**What happens behind the scenes :**
1. Validate tenant name uniqueness (prevent conflicts)
2. Create isolated customer account
3. Generate secure API key
4. Send welcome notification
5. Cache for fast subsequent access

### `/health/` & `/health/ready` - Operations Integration
**Business Value :** Enables enterprise deployment patterns

**Ops Experience :**
```bash
# Load balancer health check
curl /health/ready
→ {"status": "ready", "version": "0.1.0"}

# Monitoring system check
curl /health/
→ {"status": "healthy", "timestamp": "2025-09-18T..."}
```

**Integration Patterns :**
- **Kubernetes** : readiness/liveness probes
- **AWS ALB** : target group health checks
- **Monitoring** : Prometheus/Datadog health metrics

## 📖 Documentation Strategy

### `/docs` - Interactive API Explorer
**Why Swagger UI :** Developers can test API calls without writing code

**Features :**
- **Try it out** buttons for every endpoint
- **Real response examples** with actual data
- **Schema validation** shows exactly what fields are required
- **Authentication testing** when we add API key auth

### `/redoc` - Comprehensive Documentation
**Why ReDoc :** Clean, professional docs for integration teams

**Features :**
- **Copy-paste examples** in multiple languages
- **Schema breakdown** for complex request/response objects
- **Search functionality** across all endpoints
- **Export options** for offline documentation

## 🔧 Developer Experience Patterns

### Consistent Error Handling
```python
# Business validation error
HTTP 400: {"detail": "Tenant name must be at least 3 characters"}

# Conflict error  
HTTP 409: {"detail": "Tenant 'existing-company' already exists"}

# System error
HTTP 500: {"detail": "Internal server error"}
```

**DX Principle :** Errors tell developers exactly what to fix and how.

### Request/Response Consistency
```python
# All requests: JSON body with clear field names
{
  "tenant_name": "descriptive-name",
  "organization_name": "Human Readable Name", 
  "admin_email": "contact@company.com"
}

# All responses: Include original request data + generated fields
{
  "tenant_name": "descriptive-name",     # Echo back
  "organization_name": "Human Readable", # Echo back  
  "admin_email": "contact@company.com",  # Echo back
  "customer_id": "generated-uuid",       # Generated
  "api_key": "kuzu_generated_key",       # Generated
  "created_at": "2025-09-18T..."         # Generated
}
```

### API Versioning Strategy
```
Current: /api/v1/customers/register
Future:  /api/v2/customers/register (with breaking changes)

Migration path: Support both versions during transition
```

## 🚀 Future API Evolution

### Phase 2: Database Management
```bash
# Create database for tenant
POST /api/v1/databases
{
  "name": "user-profiles",
  "description": "Customer profile data"
}

# List tenant databases  
GET /api/v1/databases
→ [{"name": "user-profiles", "status": "active", "size_mb": 45}]
```

### Phase 3: Query Execution
```bash
# Execute Cypher query
POST /api/v1/databases/user-profiles/query
{
  "query": "MATCH (u:User) RETURN u.name LIMIT 10",
  "parameters": {}
}

# Query history and analytics
GET /api/v1/databases/user-profiles/queries
→ [{"query": "MATCH...", "duration_ms": 45, "timestamp": "..."}]
```

### Phase 4: Advanced Features
```bash
# Tenant usage analytics
GET /api/v1/tenants/my-startup/usage
→ {"queries_today": 156, "storage_gb": 2.3, "quota_remaining": "78%"}

# Real-time notifications via WebSocket
WS /api/v1/tenants/my-startup/events
→ {"type": "query_completed", "database": "user-profiles", "duration_ms": 234}
```

## 📊 API Metrics & Success

### Developer Success Metrics
```
Time to First Successful Call: < 5 minutes
API Error Rate: < 1%
Documentation Satisfaction: > 4.5/5
Integration Success Rate: > 95%
```

### Business Impact Metrics
```
Self-Service Conversion: Registration → First Query
Developer Retention: % still using after 30 days  
Support Ticket Reduction: API-related questions
Revenue Attribution: API usage → subscription upgrades
```

### Technical Health Metrics
```
API Uptime: > 99.9%
Response Latency p95: < 200ms
Documentation Coverage: 100% of endpoints
Breaking Change Frequency: < 1 per quarter
```

## 💡 API Design Principles

### 1. Developer Empathy
```
❌ "Invalid input" → Generic, unhelpful
✅ "Tenant name 'a' too short. Minimum 3 characters required." → Actionable

❌ 500 error for business rule violation → Wrong signal
✅ 409 conflict with explanation → Clear next steps
```

### 2. Progressive Disclosure
```
MVP: Simple registration endpoint
Phase 2: Add database management  
Phase 3: Add query execution
Phase 4: Add advanced analytics

Each phase builds on previous, no breaking changes
```

### 3. Self-Documenting
```
✅ Field names match business concepts: "tenant_name" not "tn"
✅ HTTP status codes match actual meanings
✅ Response includes all relevant context
✅ Examples show real-world usage patterns
```

### 4. Operational Ready
```
✅ Health endpoints for infrastructure integration
✅ Structured logging for observability
✅ Error tracking with request IDs
✅ Performance metrics built-in
```

---

**Mission** : Faire de l'adoption de Kuzu un **no-brainer** pour les développeurs grâce à une API **simple**, **bien documentée** et **fiable**.