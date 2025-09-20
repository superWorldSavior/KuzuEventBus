# KuzuEventBus - Modern Graph Database Management Platform

A modern multi-tenant **Kuzu graph database service** with hot reload development environment, providing REST API access to Kuzu databases with real-time query execution and comprehensive management features.

## ⚡ Quickstart & API Reference (MVP Sept. 2025)

### Démarrer l'environnement

- Option A — Docker complet (recommandé)
  ```bash
  make compose-up                 # Postgres, Redis, MinIO
  docker-compose up -d api worker # lance l'API et le worker en conteneurs
  ```

- Option B — Dev local (hot-reload)
  ```bash
  make compose-up     # Postgres, Redis, MinIO
  make install        # crée .venv et installe le backend en editable
  make api            # lance FastAPI en local (uvicorn --reload)
  ```

### Tests d'intégration (requiert Docker services)

```bash
make integration    # 21 passed, 2 skipped (au dernier run)
```

### Variables d'environnement clés

- `DATABASE_URL` (Postgres, requis)
- `REDIS_URL` (Redis Streams / locks)
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_SECURE`, `MINIO_BUCKET` (stockage fichiers)
- `KUZU_DATA_DIR` (répertoire local où sont créées les bases Kuzu)

### Authentification

- Header: `Authorization: Bearer kb_<votre_api_key>`
- Obtenir une clé: `POST /api/v1/customers/register`

### Endpoints principaux

- Customers
  - `POST /api/v1/customers/register` → enregistrement + API key (public)
  - `GET /api/v1/customers/{customer_id}/api-keys`
  - `DELETE /api/v1/customers/{customer_id}/api-keys/{api_key}`

- Databases
  - `GET  /api/v1/databases/` → lister les bases du tenant
  - `POST /api/v1/databases/` → créer une base
  - `GET  /api/v1/databases/{database_id}` → métadonnées
  - `DELETE /api/v1/databases/{database_id}` → supprimer
  - `POST /api/v1/databases/{database_id}/upload` → uploader un fichier lié

- Snapshots (sauvegardes)
  - `POST /api/v1/databases/{database_id}/snapshots` → créer un snapshot
  - `GET  /api/v1/databases/{database_id}/snapshots` → lister
  - `POST /api/v1/databases/{database_id}/restore` → restaurer (overwrite) depuis snapshot

- Queries (asynchrones)
  - `POST /api/v1/databases/{database_id}/query` → soumettre une requête (202)
  - `GET  /api/v1/jobs/{transaction_id}` → statut d'un job

- Events
  - `GET  /api/v1/events/stream` → SSE du tenant

Documentation interactive: `http://localhost:8000/docs` (Swagger) et `http://localhost:8000/redoc`.

## 🎯 Vision

**KuzuEventBus** empowers clients to:

- Store and manage their Kuzu graph databases (on our infrastructure or external MinIO)
- Execute Cypher queries via modern REST API
- Handle long-running transactions with real-time notifications (SSE)
- Benefit from automatic backup and versioning systems
- Develop with lightning-fast hot reload for both frontend and backend

## 🔥 **NEW: Hot Reload Development Environment**

We've implemented a comprehensive hot reload system for both backend and frontend:

### **🚀 Quick Start with Hot Reload**

```bash
# Start complete development environment with hot reload
make dev

# View real-time logs
make dev-logs

# Stop development environment
make dev-stop
```

### **✨ What's Included**

- **🔄 Backend Hot Reload**: Python/FastAPI with uvicorn `--reload`
- **⚡ Frontend HMR**: React/TypeScript with Vite Hot Module Replacement
- **🐳 Docker Development**: Optimized containers with volume mounting
- **📊 Full Stack**: PostgreSQL, Redis, MinIO, and monitoring tools
- **🛠️ Developer Tools**: Adminer, Redis Insight, MinIO Console

### **📱 Development URLs**

| Service               | URL                        | Description               |
| --------------------- | -------------------------- | ------------------------- |
| **Frontend (HMR)**    | http://localhost:3000      | React app with hot reload |
| **Backend API**       | http://localhost:8000      | FastAPI with auto-reload  |
| **API Documentation** | http://localhost:8000/docs | Swagger/OpenAPI docs      |
| **PostgreSQL Admin**  | http://localhost:8080      | Adminer interface         |
| **Redis Insight**     | http://localhost:8001      | Redis monitoring          |
| **MinIO Console**     | http://localhost:9001      | Object storage admin      |

## 📚 Documentation

- **Backend Instructions**: `.github/instructions/backend.instructions.md`
- **Frontend Instructions**: `.github/instructions/frontend.instructions.md`
- **Modular READMEs**: `backend/`, `backend/src/application/`, `backend/src/infrastructure/`
- **Architecture Decisions**: Detailed roadmaps per domain

## 🔜 Development Roadmap

### ✅ **Completed** (September 2025)

- **Hot Reload Development Environment** - Full-stack hot reload with Docker
- **Frontend Phase 4** - Query execution with Monaco Editor and real-time results
- **Backend Hexagonal Architecture** - Clean architecture with PostgreSQL persistence
- **Multi-tenant API** - Customer accounts, authentication, and database management

### 🚧 **Current Phase** (September 2025)

1. **Frontend Phase 5** - Advanced search system and filtering capabilities
2. **Backend Integration** - Finalize Redis (cache/queue) and MinIO (backups) adapters
3. **Real-time Integration** - Connect frontend to backend for live query execution

### 🎯 **Next Phases**

1. **D3.js Visualizations** - Interactive network graphs for query results
2. **Real-time Features** - SSE/WebSocket for notifications and live updates
3. **Production Readiness** - Comprehensive tests, monitoring, deployment automation

## 🏗️ Architecture & Development Principles

### Development Methodologies

- **TDD (Test-Driven Development)** - Tests first, code second
- **XP (eXtreme Programming)** - Continuous integration, permanent refactoring
- **DDD (Domain-Driven Design)** - Business-centered modeling
- **Fail Fast** - Quick error detection, strict validation
- **Feature-Sliced Design** - Frontend architecture with clear business boundaries

### Backend: Hexagonal Architecture (Clean Architecture)

```text
backend/src/
├── domain/           # Business core - Entities, business rules
│   ├── entities/     # Tenant, Database, Transaction
│   ├── ports/        # Interfaces (repositories, services)
│   └── services/     # Pure business logic
├── application/      # Use cases and orchestration
│   ├── usecases/     # Upload DB, Execute Query, etc.
│   └── dtos/         # Data Transfer Objects
├── infrastructure/   # Technical adapters
│   ├── database/     # PostgreSQL (metadata)
│   ├── cache/        # Redis (queues, sessions)
│   ├── file_storage/ # MinIO (.kuzu files)
│   ├── kuzu/         # Kuzu DB interface
│   └── auth/         # JWT, security
└── presentation/     # User interface
    └── api/          # FastAPI controllers
```

### Frontend: Feature-Sliced Design (FSD)

```text
frontend/src/
├── app/              # Application layer - global setup, routing
├── pages/            # Page compositions - route entry points
├── widgets/          # Complex UI blocks - dashboard widgets
├── features/         # Business features - auth, database-management, query-execution
├── entities/         # Business entities - customer, database, query, tenant
└── shared/           # Shared resources - UI components, API, utilities
```

### Implementation Principles

- **Ports & Adapters** for domain isolation
- **YAGNI implementations** with PostgreSQL as reference
- **Modular documentation** (READMEs per layer)
- **Hot reload optimized** for development efficiency

## 🛠️ Technology Stack

### Backend

- **FastAPI** - Modern REST API with automatic validation
- **SQLAlchemy + PostgreSQL** - ORM with robust persistence layer
- **Kuzu Python** - Native Cypher query execution
- **Pydantic v2** - DTOs and validation
- **Loguru** - Structured logging
- **Pytest + pytest-asyncio** - Unit and integration testing
- **Uvicorn** - ASGI server with hot reload support

### Frontend

- **React 18 + TypeScript + Vite** - Modern application with Zustand state management
- **Tailwind CSS + shadcn/ui** - Complete design system and production-ready components
- **Monaco Editor** - Professional Cypher query editor with syntax highlighting
- **React Query (@tanstack/react-query)** - Server state management and caching
- **Complete Dashboard** - Real-time metrics, database management, query execution
- **Feature-Sliced Design** - Scalable architecture with clear business boundaries

### DevOps & Development

- **Docker + Docker Compose** - Containerized development with hot reload
- **PostgreSQL, Redis, MinIO** - Complete infrastructure stack
- **Black, isort, MyPy** - Code formatting and static typing
- **Development Tools** - Adminer, Redis Insight, MinIO Console

## 🚀 Core Features

### 🏢 Multi-Tenant Architecture

- **Tenant Isolation** - CustomerAccount entities with API key authentication
- **Bearer Authentication** - Secure API access with PostgreSQL lookup
- **Quotas & Metrics** - Resource management and usage tracking

### 📊 Kuzu Database API

- **Direct Execution** - `POST /api/v1/databases/{database_id}/query` via dedicated Kuzu adapter
- **Detailed Logging** - Query tracking (tenant, hash, duration)
- **Async Support** - Ready for background job processing and real-time notifications

### 💾 Storage & Backup

- **Kuzu Persistence** - `.kuzu` files per tenant/database in `KUZU_DATA_DIR`
- **MinIO Integration** - Automated backups and file versioning (roadmap)
- **Redis Queue** - Background job processing and caching (roadmap)

## 🧪 Test-First Philosophy

Following the **Red-Green-Refactor** cycle:

1. **🔴 Red** - Write a failing test
2. **🟢 Green** - Minimal code to pass the test
3. **🔵 Refactor** - Improve without breaking tests

### Test Structure

```text
backend/src/
├── application/__tests__/     # Application service tests
├── api/__tests__/             # FastAPI integration tests
├── infrastructure/**/__tests__/ # Adapter tests (memory/kuzu)
└── tests/integration/         # Full stack integration tests
```

## 📋 Getting Started

### 🔥 **Option 1: Hot Reload Development (Recommended)**

Start the complete development environment with hot reload:

```bash
# Clone the repository
git clone https://github.com/superWorldSavior/KuzuEventBus.git
cd KuzuEventBus

# Start development environment (builds and starts all services)
make dev

# View logs in real-time
make dev-logs

# Stop when done
make dev-stop
```

**That's it!** 🎉 Your development environment is ready with:

- ✅ Backend API with hot reload at http://localhost:8000
- ✅ Frontend with HMR at http://localhost:3000
- ✅ All infrastructure services (PostgreSQL, Redis, MinIO)
- ✅ Development tools and admin interfaces

### 🛠️ **Option 2: Manual Setup**

If you prefer to set up services individually:

#### 1. Start Infrastructure

```bash
# Start required services
docker-compose up -d postgres redis minio

# Wait for services to be ready
bash scripts/wait-for-services.sh
```

#### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run tests
pytest

# Start development server
uvicorn src.presentation.api.main:app --reload
```

#### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server with HMR
npm run dev
```

### 🔧 Environment Variables

Key environment variables (automatically configured in development):

```bash
# Database
DATABASE_URL=postgresql+psycopg2://kuzu_user:kuzu_password@localhost:5432/kuzu_eventbus

# Kuzu
KUZU_DATA_DIR=./kuzu_data_query_endpoint

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
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

## 🧰 Advanced Development Commands

### Hot Reload Development

```bash
# Start complete development environment
make dev

# View real-time logs for all services
make dev-logs

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f worker

# Restart specific service (maintains hot reload)  
docker-compose -f docker-compose.dev.yml restart api

# Stop all development services
make dev-stop

# Rebuild development images
make dev-build
```

### Testing

```bash
# Backend unit tests
cd backend && pytest

# Frontend tests  
cd frontend && npm test

# Integration tests (requires infrastructure)
cd backend && pytest -m "integration"
```

### Code Quality

```bash
# Backend formatting
cd backend
black src/ tests/
isort src/ tests/
mypy src/

# Frontend linting
cd frontend  
npm run lint
npm run type-check
```

## 💡 Development Tips

### Hot Reload Features

- **Backend**: Changes to Python files automatically restart the FastAPI server
- **Frontend**: React components update instantly without page refresh (HMR)
- **Worker**: Background processes restart automatically on code changes
- **Database**: Schema changes require manual restart, but queries are live

### Debugging

- **Backend debugging**: `docker-compose -f docker-compose.dev.yml logs -f api`
- **Frontend debugging**: `docker-compose -f docker-compose.dev.yml logs -f frontend`
- **Database inspection**: Adminer at http://localhost:8080
- **Redis monitoring**: Redis Insight at http://localhost:8001

### Development Workflow

```bash
# Start development
git checkout -b feature/my-new-feature
make dev

# Make changes (hot reload active)
# Edit backend files - see changes at http://localhost:8000
# Edit frontend files - see changes at http://localhost:3000

# Test changes
make test

# Submit changes
git add .
git commit -m "feat: add my new feature"
git push origin feature/my-new-feature
```

---

### 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/superWorldSavior/KuzuEventBus/issues)
- **Documentation**: Comprehensive guides in `.github/instructions/`
- **Architecture**: Detailed explanations in component READMEs

