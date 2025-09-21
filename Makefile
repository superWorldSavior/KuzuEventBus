SHELL := /bin/bash

# Prefer Docker Compose v2 ("docker compose").
# Override at invocation if needed, e.g.:
#   make DOCKER_COMPOSE="docker-compose" integration
DOCKER_COMPOSE ?= docker compose


.PHONY: compose-up compose-down compose-logs wait api test unit integration integration-noup e2e install env start worker dev dev-start dev-stop dev-logs dev-build dev-restart compose-api compose-all


env:
	@echo "Loading .env if present"; \
	if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi; \
	true

# Production/Traditional Docker Compose commands
compose-up:
	$(DOCKER_COMPOSE) up -d --no-recreate postgres redis minio

compose-api:
	$(DOCKER_COMPOSE) up -d --no-recreate api worker

compose-all:
	$(DOCKER_COMPOSE) up -d --no-recreate postgres redis minio api worker

compose-down:
	$(DOCKER_COMPOSE) down

compose-logs:
	$(DOCKER_COMPOSE) logs -f --tail=200

# Development environment with hot reload
dev-build:
	@echo " Building development Docker images..."
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml build --no-cache

dev-start: dev-build
	@echo " Starting development environment with hot reload..."
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d
	@echo " Development environment started!"
	@echo ""
	@echo " Application URLs:"
	@echo "  Frontend (HMR):   http://localhost:3000"
	@echo "  Backend API:      http://localhost:8000"
	@echo "  API Docs:         http://localhost:8000/docs"
	@echo "  Adminer:          http://localhost:8080"
	@echo "  Redis Insight:    http://localhost:8001"
	@echo "  MinIO Console:    http://localhost:9001"
	@echo ""
	@echo " Hot reload is enabled for both frontend and backend!"
	@echo " Use 'make dev-logs' to view logs"

dev-stop:
	@echo " Stopping development environment..."
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down --remove-orphans

dev-logs:
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f --tail=100

dev-restart:
	@echo " Restarting development environment..."
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml restart

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

integration-noup:
	. .venv/bin/activate; \
	export ENVIRONMENT=development; \
	pytest -m "integration or e2e" -q

test: unit

e2e: integration
