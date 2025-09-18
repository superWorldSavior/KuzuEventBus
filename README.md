# Kuzu Event Bus - Service Managé

Un service managé pour gérer les transactions Kuzu via une API REST moderne avec support multi-tenant.

## 🎯 Vision

Service permettant aux clients de :
- Stocker leurs bases de données Kuzu (sur notre infrastructure ou MinIO externe)
- Exécuter des requêtes Cypher via API REST
- Gérer des transactions longues avec notifications en temps réel (SSE)
- Bénéficier d'un système de backup et versioning automatique

## 🏗️ Architecture & Principes

### Méthodologies de Développement

- **TDD (Test-Driven Development)** : Tests d'abord, code ensuite
- **XP (eXtreme Programming)** : Intégration continue, refactoring permanent
- **DDD (Domain-Driven Design)** : Modélisation centrée sur le métier
- **Fail Fast** : Détection rapide des erreurs, validation stricte

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

## 🛠️ Stack Technique

**Backend:**
- **FastAPI** : API REST moderne avec validation automatique
- **SQLAlchemy** : ORM pour métadonnées (PostgreSQL)
- **Redis Streams** : Queue des transactions + cache
- **Redlock** : Verrous distribués pour transactions longues
- **MinIO** : Stockage S3-compatible pour DBs Kuzu
- **Kuzu Python** : Interface avec les bases graphes
- **JWT** : Authentification avec isolation par tenant
- **Pydantic** :
- **Loguru** : 

**DevOps:**
- **Docker** : Containerisation
- **Pytest** : Tests unitaires et d'intégration
- **Black/isort** : Formatage du code
- **MyPy** : Typage statique

## 🚀 Fonctionnalités Core

### Multi-Tenant
- Isolation complète des données par tenant
- Gestion des quotas et permissions
- Dossiers séparés dans MinIO

### API Kuzu
- Exécution directe de requêtes Cypher
- Support des transactions ACID
- Gestion des requêtes longues avec SSE
- Validation et sanitization des requêtes

### Stockage & Backup
- Upload/download de DBs Kuzu
- Versioning automatique
- Backup incrémental
- Migration entre versions

## 🧪 Philosophie Test-First

1. **Red** : Écrire un test qui échoue
2. **Green** : Code minimal pour passer le test
3. **Refactor** : Améliorer sans casser les tests

### Structure des Tests
```
tests/
├── unit/           # Tests unitaires (domaine + usecases)
├── integration/    # Tests d'intégration (adapters)
├── e2e/           # Tests end-to-end (API complète)
└── fixtures/      # Données de test
```

## 📋 Getting Started

```bash
# Setup environnement
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Lancer les services (Redis, PostgreSQL, MinIO)
docker-compose up -d

# Tests
pytest

# Dev server
uvicorn src.main:app --reload
```

## 🎯 Principes Fail Fast

- **Validation stricte** des inputs (Pydantic)
- **Type hints** obligatoires (MyPy)
- **Exceptions explicites** plutôt que valeurs None
- **Circuit breakers** pour les services externes
- **Health checks** sur tous les composants

---

*Built with ❤️ using Clean Architecture, TDD, and modern Python practices*