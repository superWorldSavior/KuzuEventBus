# Kuzu Event Bus - Service Managé

Un service managé pour gérer les transactions et bases Kuzu via une API REST moderne avec support multi-tenant.

## 🎯 Vision

Service p## 📚 Documentation

- Instructions détaillées : `.github/instructions/backend.instructions.md` & `frontend.instructions.md`
- READMEs dédiés : `backend/`, `backend/src/application/`, `backend/src/infrastructure/`, etc.
- Roadmaps par domaine (ex: `backend/src/infrastructure/README.md` pour la stratégie YAGNI → migration Postgres/Redis/MinIO)

## 🤝 Contributions clients de :

- Stocker leurs bases de données Kuzu (sur notre infrastructure ou MinIO externe)
- Exécuter des requêtes Cypher via API REST
- Gérer des transactions longues avec notifications en temps réel (SSE)
- Bénéficier d'un système de backup et versioning automatique

## 🔜 Roadmap

### Phase Actuelle (Septembre 2025)

1. **Frontend Phase 5** : Système de recherche avancée et filtres
2. **Backend** : Finaliser adaptateurs Redis (cache/queue) et MinIO (backups)
3. **Intégration** : Connecter frontend au backend pour requêtes temps réel

### Prochaines Phases

1. **D3.js Visualizations** : Graphiques réseau interactifs pour résultats de requêtes
2. **Real-time Features** : SSE/WebSocket pour notifications et mises à jour temps réel
3. **Production Readiness** : Tests complets, monitoring, déploiement

## ️ Architecture & Principes

### Méthodologies de Développement

- **TDD (Test-Driven Development)** : tests d'abord, code ensuite
- **XP (eXtreme Programming)** : intégration continue, refactoring permanent
- **DDD (Domain-Driven Design)** : modélisation centrée sur le métier
- **Fail Fast** : détection rapide des erreurs, validation stricte

### Architecture Hexagonale (Clean Architecture)

```
src/
├── domain/           # Cœur métier - Entités, règles business
│   ├── entities/     # Tenant, Database, Transaction
│   ├── ports/        # Interfaces (ex-repositories)
│   └── services/     # Logique métier pure
├── application/      # Cas d'usage et orchestration
│   ├── usecases/     # Upload DB, Execute Query, etc.
│   └── dtos/         # Data Transfer Objects
├── infrastructure/   # Adapters techniques
│   ├── database/     # PostgreSQL (métadonnées)
│   ├── cache/        # Redis (queues, sessions)
│   ├── file_storage/ # MinIO (fichiers .kuzu)
│   ├── kuzu/         # Interface Kuzu DB
│   └── auth/         # JWT, sécurité
└── presentation/     # Interface utilisateur
    └── api/          # Controllers FastAPI
```

### Principes d'Implémentation

- Ports & Adapters pour isoler le domaine
- Implémentations YAGNI en mémoire possibles mais Postgres est maintenant la référence
- Documentation modulaire (READMEs par couche)

## 🛠️ Stack Technique

### Backend

- **FastAPI** : API REST avec validation automatique
- **SQLAlchemy** : ORM connecté à **PostgreSQL** (obligatoire)
- **Kuzu Python** : exécution native des requêtes Cypher
- **Pydantic v2** : DTO et validation
- **Loguru** : logging structuré
- **Pytest / pytest-asyncio** : tests unitaires et d'intégration

### DevOps

- **Docker Compose** : Postgres, Redis, MinIO, outils d'observation
- **Black / isort** : formatage
- **MyPy** : typage statique

### Frontend

- **React 18 + TypeScript + Vite** : Application moderne avec état géré par Zustand et React Query
- **Tailwind CSS + shadcn/ui** : Design system complet et composants prêts pour production
- **Monaco Editor** : Éditeur de requêtes Cypher professionnel avec syntaxe highlighting
- **Dashboard complet** : Métriques en temps réel, gestion des bases, exécution de requêtes
- **Status** : Phase 4 terminée (Query Execution), actuellement Phase 5 (Advanced Search)
- **Prêt pour** : Intégration D3.js, visualisations réseau avancées

## 🚀 Fonctionnalités Core

### Multi-Tenant

- Isolation des tenants via CustomerAccount et clés API
- Authentification Bearer avec lookup Postgres
- Préparation des quotas et métriques

### API Kuzu

- Exécution directe (`POST /api/v1/databases/{database_id}/query`) via adaptateur Kuzu dédié
- Logging détaillé des requêtes (tenant, hash, durée)
- DTOs prêts pour futures routes (soumission async, statistiques)

### Stockage & Backup

- Moteur Kuzu persistant : fichiers `.kuzu` par tenant/db dans `KUZU_DATA_DIR`
- Roadmap : intégration MinIO pour backups, Redis pour queue/cache

## 🧪 Philosophie Test-First

1. **Red** : écrire un test qui échoue
2. **Green** : code minimal pour passer le test
3. **Refactor** : améliorer sans casser les tests

### Structure des Tests

```
backend/src/
├── application/__tests__/     # tests services d'orchestration
├── api/__tests__/             # tests d'intégration FastAPI
├── infrastructure/**/__tests__# tests adaptateurs (memory / kuzu)
```

## 📋 Getting Started

### 1. Lancer l'infrastructure

PostgreSQL est désormais requis (Redis/MinIO démarrés mais pas encore branchés).

```bash
docker-compose up -d postgres redis minio
```

### 2. Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Variables d'environnement

- `DATABASE_URL` (par défaut `postgresql+psycopg2://kuzu_user:kuzu_password@localhost:5432/kuzu_eventbus`)
- `KUZU_DATA_DIR` : répertoire cible des bases Kuzu (ex: `./kuzu_data_query_endpoint`)

### 4. Tests

```bash
# Service application & domaine
pytest src/application/__tests__/test_customer_account_service.py

# Tests API (Postgres nécessaire)
pytest src/api/__tests__/test_query_endpoint.py
```

### 5. Serveur de développement

```bash
uvicorn src.api.main:app --reload
```

## 🎯 Principes Fail Fast

- Validation stricte des inputs (Pydantic)
- Types obligatoires (MyPy / annotations)
- Exceptions explicites plutôt que `None`
- Health checks sur chaque composant
- Logging structuré pour chaque requête

## 📚 Documentation

- Instructions détaillées : `.github/instructions/backend.instructions.md` & `frontend.instructions.md`
- READMEs dédiés : `backend/`, `backend/src/application/`, `backend/src/infrastructure/`, etc.
- Roadmaps par domaine (ex: `backend/src/infrastructure/README.md` pour la stratégie YAGNI → migration Postgres/Redis/MinIO)

## 🔜 Roadmap

1. Adapter docs & tests pour refléter la persistance Postgres partout (en cours).
2. Brancher Redis (queue + cache) et MinIO (backups), créer les adaptateurs + tests contractuels.
3. Raccorder le frontend existant à l’API.

## 🤝 Contributions

- Respect de l’architecture hexagonale (pas de dépendances inverses)
- Tests obligatoires
- Documentation mise à jour pour chaque feature

---

_Built with ❤️ using Clean Architecture, TDD, and YAGNI so the service can évoluer sereinement._
