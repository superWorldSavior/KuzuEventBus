# Kuzu Event Bus - AI Coding Agent Instructions

## 📋 Context-Driven Instructions

This project consists of both backend and frontend components. **Always refer to the appropriate detailed instruction file based on the context of your work:**

### 🔧 Backend Development

When working on backend code (FastAPI, Python, domain logic, infrastructure, databases, APIs):
**→ Use `.github/instructions/backend.instructions.md` as your primary context**

### 🎨 Frontend Development

When working on frontend code (React, TypeScript, UI components, pages, features):
**→ Use `.github/instructions/frontend.instructions.md` as your primary context**

## 🎯 Project Overview

**KuzuEventBus** is a modern multi-tenant **Kuzu graph database service** with:

- **Backend**: FastAPI with hexagonal architecture
- **Frontend**: React/TypeScript with Feature-Sliced Design
- **Core Mission**: Simple, testable, evolvable service following Clean Architecture

## 🚀 Development Methodologies (Both Layers)

- **TDD (Test-Driven Development)**: Red-Green-Refactor cycle mandatory
- **DDD (Domain-Driven Design)**: Business logic drives architecture
- **XP (eXtreme Programming)**: Continuous integration, permanent refactoring
- **Fail Fast**: Explicit validation, immediate error detection
- **YAGNI**: You aren't gonna need it - start simple, evolve when needed

## 🏗️ Architecture Overview

### Backend: Hexagonal Architecture

```
backend/src/
├── domain/              # Pure business logic
├── application/         # Use case orchestration
├── infrastructure/      # Technical adapters
└── presentation/api/    # FastAPI controllers
```

### Frontend: Feature-Sliced Design

```
frontend/src/
├── app/                 # Application layer - routing, providers
├── pages/               # Page compositions - route entry points
├── widgets/             # Complex UI blocks - dashboard widgets
├── features/            # Business features - auth, queries, databases
├── entities/            # Business entities - customer, tenant, query
└── shared/              # Reusable code - UI components, utilities
```

## ⚡ Quick Start Commands

### Backend Development

```bash
cd backend/
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pytest                    # Run tests
uvicorn src.presentation.api.main:app --reload
```

### Frontend Development

```bash
cd frontend/
npm install
npm run dev               # Development server
npm test                  # Run tests
npm run build             # Production build
```

### Full Stack

```bash
docker-compose up -d      # Services (Redis, PostgreSQL, MinIO)
make dev                  # Start both backend and frontend
```

## 🎯 Context Detection Rules

**Automatically use the appropriate instruction file when:**

### Backend Context Triggers:

- Working with files in `backend/` directory
- Python/FastAPI code generation
- API endpoints, middleware, authentication
- Domain entities, use cases, repositories
- Database queries, infrastructure adapters
- pytest tests, backend configuration

### Frontend Context Triggers:

- Working with files in `frontend/` directory
- React/TypeScript code generation
- UI components, pages, features
- State management, API integration
- Frontend routing, form handling
- Vitest tests, frontend configuration

## 📁 Key Reference Files

### Backend

- `backend/src/domain/shared/ports/` - Protocol definitions
- `backend/src/domain/tenant_management/customer_account.py` - Core patterns
- `backend/src/infrastructure/memory/` - YAGNI implementations
- `backend/pyproject.toml` - Test configuration

### Frontend

- `frontend/src/shared/ui/` - Reusable UI components
- `frontend/src/features/` - Business feature implementations
- `frontend/src/shared/api/` - API integration patterns
- `frontend/package.json` - Frontend dependencies

## ⚠️ Universal Constraints

- **Context-first approach**: Always consult the appropriate detailed instruction file
- **NEVER recreate existing files** - Extend existing implementations
- **Follow established patterns** - Check existing structure before adding new code
- **Test-driven development** - Write tests first for both backend and frontend
- **Type safety mandatory** - MyPy for Python, TypeScript strict mode
- **Explicit naming** - File names must clearly indicate purpose and layer

---

**🎯 Remember: This is a high-level overview. For detailed patterns, conventions, and implementation guidelines, always refer to:**

- **Backend work**: `.github/instructions/backend.instructions.md`
- **Frontend work**: `.github/instructions/frontend.instructions.md`
