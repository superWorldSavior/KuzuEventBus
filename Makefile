SHELL := /bin/bash


.PHONY: compose-up compose-down compose-logs wait api test unit integration e2e install env start worker dev dev-start dev-stop dev-logs dev-build


env:
	@echo "Loading .env if present"; \
	if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi; \
	true

# Production/Traditional Docker Compose commands
compose-up:
	docker-compose up -d postgres redis minio

compose-api:
	docker-compose up -d api worker

compose-all:
	docker-compose up -d postgres redis minio api worker

compose-down:
	docker-compose down

compose-logs:
	docker-compose logs -f --tail=200

# Development environment with hot reload
dev-build:
	@echo "🔨 Building development Docker images..."
	docker-compose -f docker-compose.dev.yml build --no-cache

dev-start: dev-build
	@echo "🚀 Starting development environment with hot reload..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development environment started!"
	@echo ""
	@echo "📱 Application URLs:"
	@echo "  Frontend (HMR):   http://localhost:3000"
	@echo "  Backend API:      http://localhost:8000"
	@echo "  API Docs:         http://localhost:8000/docs"
	@echo "  Adminer:          http://localhost:8080"
	@echo "  Redis Insight:    http://localhost:8001"
	@echo "  MinIO Console:    http://localhost:9001"
	@echo ""
	@echo "🔥 Hot reload is enabled for both frontend and backend!"
	@echo "💡 Use 'make dev-logs' to view logs"

dev-stop:
	@echo "🛑 Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down --remove-orphans

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f --tail=100

dev-restart:
	@echo "🔄 Restarting development environment..."
	docker-compose -f docker-compose.dev.yml restart

# Alias for development
dev: dev-start

wait:
	bash scripts/wait-for-services.sh

install:
	python3 -m venv .venv || true; \
	. .venv/bin/activate; \
	pip install -U pip; \
	pip install -e backend/.[dev]

api:
	. .venv/bin/activate; \
	export ENVIRONMENT=development; \
	uvicorn src.presentation.api.main:app --reload

# Alias pratique: `make start` démarre l'API (équivaut à `make api`)
start: api

worker:
	. .venv/bin/activate; \
	export ENVIRONMENT=development; \
	python backend/scripts/run_query_worker.py

unit:
	. .venv/bin/activate; \
	export ENVIRONMENT=test; \
	pytest -q

integration: compose-up wait
	. .venv/bin/activate; \
	export ENVIRONMENT=development; \
	pytest -m "integration or e2e" -q

test: unit

e2e: integration

