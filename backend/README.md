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
curl -X POST http://localhost:8200/api/v1/customers/register \
  -H "Content-Type: application/json" \
  -d '{"tenant_name": "my-startup", "organization_name": "My Startup Inc", "admin_email": "cto@mystartup.com"}'

# Vérifier la documentation
open http://localhost:8200/docs
```

### For Developers
```bash
# Setup environnement
make install

# Tests complets
make unit
make integration

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
make unit                  # tests unitaires
make integration           # tests d'intégration (Postgres/Redis/MinIO)

# 6) Logs et arrêt des services
make compose-logs          # suivre les logs docker
make compose-down          # arrêter/supprimer les conteneurs
```

> ⚠️ **Ports personnalisés** : Ce projet utilise des ports non-standard pour éviter les conflits. Voir [PORTS.md](../PORTS.md) pour la liste complète.

### Lancer l'API (résumé)
- Avec Make: `make api`

## 🗂️ Cheatsheets Infra

- [Infrastructure (vue d’ensemble)](src/infrastructure/README.md)
- [Auth](src/infrastructure/auth/README.md)
- [Cache (Redis)](src/infrastructure/cache/README.md)
- [Database (Postgres)](src/infrastructure/database/README.md)
- [File Storage (MinIO)](src/infrastructure/file_storage/README.md)
- [Kuzu](src/infrastructure/kuzu/README.md)
- [Redis (cache/queue/locks)](src/infrastructure/redis/README.md)
- [Notifications](src/infrastructure/notifications/README.md)

### Persistence (nouvelle implémentation)
- Le service utilise désormais PostgreSQL **obligatoirement** (`DATABASE_URL` ou `postgres://kuzu_user:...`).
- Démarrez les conteneurs `postgres`/`redis` via `docker compose up -d` (ou mieux via `make compose-up`) avant `uvicorn` ou les tests API pour conserver tenants et clés API.

## 📘 API actuelle (MVP)

### Auth
- REST (recommandé): `Authorization: Bearer kb_<api_key>`
- Legacy (temporaire): `X-API-Key: kb_<api_key>` (sera déprécié)
- Obtenir une API key: `POST /api/v1/auth/register` ou `POST /api/v1/auth/login`
- SSE sécurisé (JWT court‑vécu):
  - Mint token: `POST /api/v1/auth/sse-token` (authentifié via Bearer ci‑dessus)
  - Consommer SSE: `GET /api/v1/events/stream?token=<jwt>`
  - Le token SSE est scope‑limité (`sse:read`) et expire (TTL par défaut: 300s)

### Auth
- `POST /api/v1/auth/register` (public) – inscription avec email/password
- `POST /api/v1/auth/login` (public) – connexion email/password
- `POST /api/v1/auth/sse-token` (auth requise) – mint JWT pour SSE

### Customers
- `GET  /api/v1/customers/{customer_id}` – détails minimas du compte (validation de session côté frontend)
- `GET  /api/v1/customers/{customer_id}/api-keys`
- `DELETE /api/v1/customers/{customer_id}/api-keys/{api_key}`

### Databases
- `GET  /api/v1/databases/` – liste des bases du tenant
- `POST /api/v1/databases/` – créer une base
- `GET  /api/v1/databases/{database_id}` – métadonnées d’une base
- `DELETE /api/v1/databases/{database_id}` – suppression
- `POST /api/v1/databases/{database_id}/upload` – upload de fichier (base64)

### Snapshots
- `POST /api/v1/databases/{database_id}/snapshots` – créer un snapshot (répertoire → tar.gz, fichier `.kuzu` → direct)
- `GET  /api/v1/databases/{database_id}/snapshots` – lister les snapshots
- `POST /api/v1/databases/{database_id}/restore` – restaurer (overwrite) un snapshot

### PITR (Point-In-Time Recovery)
- `GET  /api/v1/databases/{database_id}/pitr?start=&end=&window=&include_types=&target=` – timeline (snapshots + WAL) et plan (si `target`)
- `POST /api/v1/databases/{database_id}/restore-pitr?target_timestamp=` – restaurer à un instant précis
- `GET  /api/v1/databases/{database_id}/pitr/bookmarks` – lister les bookmarks
- `POST /api/v1/databases/{database_id}/pitr/bookmarks` – créer/mettre à jour un bookmark `{ name, timestamp }`
- `DELETE /api/v1/databases/{database_id}/pitr/bookmarks/{name}` – supprimer un bookmark

### Queries (asynchrones)
- `POST /api/v1/databases/{database_id}/query` – soumettre une requête (202)
- `GET  /api/v1/jobs/{transaction_id}` – statut du job
- `GET  /api/v1/jobs/{transaction_id}/results` – récupérer les résultats d'un job terminé (TTL cache)
- `GET  /api/v1/databases/{database_id}/queries/popular` – top requêtes (hors favoris)
- `GET  /api/v1/databases/{database_id}/queries/favorites` – lister les favoris
- `POST /api/v1/databases/{database_id}/queries/favorites` – ajouter un favori (max 10)
- `DELETE /api/v1/databases/{database_id}/queries/favorites/{query_hash}` – supprimer un favori

### Events
- `GET  /api/v1/events/stream?token=<jwt>` – flux SSE scoping tenant
  - Le paramètre `token` est un JWT court‑vécu émis par `POST /api/v1/auth/sse-token`
  - Les API keys en query string ne sont pas acceptées (sécurité)

Docs interactives: http://localhost:8200/docs et http://localhost:8200/redoc

Pour les détails des modèles et exemples de payloads, voir aussi:
- `src/presentation/api/databases/README.md`


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
