# Kuzu Event Bus - Backend

Un **service Event Bus multi-tenant** qui permet aux équipes de développement de gérer leurs bases de données graphes Kuzu dans un environnement partagé et sécurisé.

## � Que fait ce service ?

### Pour les Équipes de Développement
- **Créer un compte** → Obtenez votre espace isolé (tenant)
- **Gérer vos données graphes** → Bases Kuzu dédiées par projet
- **Exécuter des requêtes** → Interface unified pour vos apps
- **Monitoring et alertes** → Visibilité sur vos performances

### Pour les Ops/DevOps
- **Multi-tenancy sécurisé** → Isolation complète entre clients
- **Scalabilité horizontale** → Ajouter des clients sans friction
- **Monitoring unifié** → Vue d'ensemble de tous les tenants
- **API-first** → Intégration dans vos pipelines CI/CD

## 🚀 Vision Produit

### MVP Actuel (YAGNI)
> "Do the simplest thing that could work"

**Customer Onboarding :**
- Enregistrement self-service avec validation
- Génération automatique d'API keys
- Notifications de bienvenue

**Pourquoi YAGNI ?** 
Démarrer simple permet de valider le product-market fit avant d'investir dans l'infrastructure complexe.

### Prochaines Itérations

**Phase 2 - Database Management :**
- Création/suppression de bases Kuzu
- Gestion des schémas et permissions
- Interface admin pour les tenants

**Phase 3 - Query Execution :**
- API unifiée pour requêtes Cypher
- Rate limiting et quotas
- Cache intelligent des résultats

**Phase 4 - Enterprise Features :**
- Audit trails et compliance
- Backup/restore automatisé
- Multi-region deployment

## � Business Value

### Problèmes Résolus
1. **Fragmentation** → Une seule interface pour toutes vos bases graphes
2. **Setup Complexity** → Onboarding en self-service 
3. **Isolation** → Sécurité multi-tenant native
4. **Scalability** → Croissance sans refonte d'architecture

### Métriques de Succès
- **Time to First Query** : < 5 minutes après inscription
- **API Uptime** : > 99.9%
- **Tenant Isolation** : 0 incident de cross-contamination
- **Developer Experience** : < 2 étapes pour onboarding

## 🏗️ Architecture Business

### Multi-Tenancy Model
```
Tenant A → API Keys → Databases [graph-users, graph-products]
Tenant B → API Keys → Databases [graph-analytics, graph-recommendations]
Tenant C → API Keys → Databases [graph-social]
```

### Service Boundaries
- **Customer Management** : Qui peut faire quoi ?
- **Database Management** : Où sont les données ?
- **Query Execution** : Comment accéder aux données ?
- **Monitoring** : Que se passe-t-il ?


## 🚀 Getting Started (Business)

### For Product Managers
```bash
# Démarrer le service
make start

# Tester l'onboarding
curl -X POST http://localhost:8000/api/v1/customers/register \
  -H "Content-Type: application/json" \
  -d '{"tenant_name": "my-startup", "organization_name": "My Startup Inc", "admin_email": "cto@mystartup.com"}'

# Vérifier la documentation
open http://localhost:8000/docs
```

### For Developers
```bash
# Setup environnement
make setup

# Tests complets
make test

# Couverture
make coverage
```

### Quickstart (avec Make)
```bash
# 1) Démarrer l'infra requise (Postgres, Redis)
make compose-up

# 2) Attendre que les services soient prêts (optionnel si déjà prêts)
make wait

# 3) Installer les dépendances dans .venv à la racine
make install

# 4) Lancer l'API en mode dev
make api

# 5) Tests
make unit                  # tous les tests unitaires
make integration           # tests d'intégration (nécessitent Postgres/Redis)

# 6) Logs et arrêt des services
make compose-logs          # suivre les logs docker
make compose-down          # arrêter/supprimer les conteneurs
```

### Lancer l'API (résumé)
- Avec Make: `make api`

### Persistence (nouvelle implémentation)
- Le service utilise désormais PostgreSQL **obligatoirement** (`DATABASE_URL` ou `postgres://kuzu_user:...`).
- Démarrez les conteneurs `postgres`/`redis` via `docker-compose up -d` avant `uvicorn` ou les tests API pour conserver tenants et clés API.


## 🤝 Pour Contribuer

### Business Context First
1. **Comprendre le use case** → Qui utilise cette feature et pourquoi ?
2. **Définir la valeur** → Quel problème business ça résout ?
3. **YAGNI check** → Est-ce qu'on en a vraiment besoin maintenant ?
4. **Implémenter** → Le plus simple qui marche

### Architecture Principles
- **Domain-first** → Business logic avant technical implementation
- **Ports & Adapters** → Infrastructure pluggable
- **Test-driven** → Comportements business couverts
- **YAGNI-oriented** → Éviter la sur-ingénierie

---

**Mission** : Démocratiser l'accès aux bases de données graphes pour les équipes de développement.
