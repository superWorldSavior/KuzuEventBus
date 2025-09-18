# Domain Layer - Business Logic

La **logique métier pure** qui définit ce que fait le système et comment il se comporte, indépendamment de toute infrastructure.

## � Qu'est-ce qu'on gère ?

### Multi-Tenancy Business Model
**Le Problème :** Comment permettre à plusieurs équipes/entreprises d'utiliser le même service Kuzu sans se marcher dessus ?

**Notre Solution :**
- Chaque **tenant** = espace isolé avec ses propres données
- Validation stricte des noms (pas de collision possible)
- États du cycle de vie (pending → active → suspended)

### Règles Métier Critiques

#### 1. Unicité des Tenants
```
❌ "company-x" existe déjà → Registration refused
✅ "company-y" libre → Registration accepted
```

#### 2. Validation des Identifiants
```
❌ "a" → Trop court (min 3 chars)
❌ "company@123" → Caractères invalides
❌ "company-" → Ne peut pas finir par tiret
✅ "company-dev" → Format valide
```

#### 3. Cycle de Vie des Comptes
```
PENDING → ACTIVE → SUSPENDED → TERMINATED
    ↓         ↓         ↓
  [auto]   [admin]   [auto/admin]
```

## 📦 Composants Business

### Tenant Identity (`TenantName`)
**Pourquoi c'est critique :** L'identifiant unique qui garantit l'isolation multi-tenant.

**Règles strictes :**
- 3-50 caractères (lisibilité + contraintes DB)
- Alphanumériques + tirets/underscores (URL-safe)
- Pas de caractères spéciaux (sécurité)

### Customer Lifecycle (`CustomerAccount`)
**Pourquoi c'est important :** Gère qui peut accéder au système et dans quelles conditions.

**États Business :**
- **PENDING** : Compte créé, en attente d'activation
- **ACTIVE** : Pleinement opérationnel
- **SUSPENDED** : Temporairement désactivé (facture impayée, etc.)
- **TERMINATED** : Fermé définitivement

### Email Management (`EmailAddress`)
**Pourquoi c'est nécessaire :** Point de contact unique pour chaque tenant + authentification.

**Règles :**
- Format email standard (regex validation)
- Normalisation automatique (lowercase)
- Longueur limitée (contraintes DB)

## 🔧 Business Rules Engine

### Validation d'Enregistrement
```
Nouveau Tenant Request → Validation Pipeline → Accept/Reject

Pipeline:
1. Format tenant name valide ?
2. Tenant name disponible ?
3. Email format valide ?
4. Email pas déjà utilisé ? (future)
→ Si tout OK : Créer compte PENDING
```

### Transitions d'État
```
Business Triggers:
- Payment received → PENDING → ACTIVE
- Payment failed → ACTIVE → SUSPENDED  
- Account closure → ANY → TERMINATED
- Reactivation → SUSPENDED → ACTIVE
```

## 🎭 Business Scenarios

### Scenario 1: Nouvel Utilisateur
```
1. Développeur visite notre landing page
2. Clique "Sign Up"
3. Remplit: tenant="acme-dev", email="dev@acme.com", org="Acme Corp"
4. Système valide + crée compte PENDING
5. Email de confirmation envoyé
6. Activation manuelle/auto → ACTIVE
7. Développeur peut créer ses bases Kuzu
```

### Scenario 2: Problème de Paiement
```
1. Tenant "acme-dev" a une facture impayée
2. Après grace period → Admin suspend compte
3. Toutes les bases Kuzu deviennent read-only
4. Notifications envoyées à admin@acme.com
5. Une fois payé → Réactivation automatique
```

### Scenario 3: Croissance d'Équipe
```
1. "acme-dev" veut séparer envs: dev/staging/prod
2. Créent nouveaux tenants: "acme-staging", "acme-prod"
3. Chaque tenant = isolation complète
4. Même organisation, billing unifié (future)
```

## ⚡ Business Events

### Événements Métier Importants
```
CustomerRegistered → Trigger welcome email + onboarding
CustomerActivated → Trigger access to dashboard
CustomerSuspended → Trigger notifications + read-only mode
CustomerTerminated → Trigger data cleanup + final backup
```

### Intégrations Business
```
Registration → CRM (sales lead)
Activation → Analytics (conversion funnel)  
Suspension → Billing system (payment retry)
Usage → Monitoring (quotas & limits)
```

## � Business Evolution

### Phase 1 (Current): Basic Tenant Management
- ✅ Self-service registration
- ✅ Basic lifecycle (pending/active/suspended)
- ✅ Identity validation

### Phase 2: Enhanced Tenant Features
- 🔄 Multi-user per tenant (teams)
- 🔄 Role-based permissions (admin/dev/readonly)
- 🔄 Tenant-level quotas and limits

### Phase 3: Enterprise Features
- 📋 SSO integration (SAML/OAuth)
- 📋 Audit trails and compliance
- 📋 Cross-tenant data sharing (controlled)

### Phase 4: Platform Features
- 📋 Tenant marketplace (public datasets)
- 📋 Multi-region deployment
- 📋 Disaster recovery per tenant

## 💡 Business Insights

### Pourquoi cette Architecture ?
1. **Isolation Guarantee** : Impossible de voir les données d'un autre tenant
2. **Scalability Model** : Ajouter des tenants = linear growth, pas exponential complexity
3. **Business Flexibility** : Différents pricing tiers par tenant
4. **Compliance Ready** : Isolation + audit trails = GDPR/SOC2 compatible

### Métriques Business
```
Tenant Health:
- Time to activation (objectif: < 1 jour)
- Monthly active tenants
- Churn rate by suspension reason

Product Health:
- Registration conversion rate
- Support tickets per tenant
- Feature adoption by tenant size
```

### Décisions Business vs Tech
```
Business Decision: "Tenant names must be unique globally"
Tech Impact: Need global uniqueness check in registration

Business Decision: "Suspended tenants keep data but can't modify"
Tech Impact: Read-only mode implementation needed

Business Decision: "Self-service registration with email validation"
Tech Impact: Async email service + confirmation workflow
```

---

**Principe clé** : Le domaine encode **les règles métier** qui garantissent que le système se comporte **comme le business l'attend**, indépendamment de l'implémentation technique.