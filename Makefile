SHELL := /bin/bash

# Enforce Docker Compose v2. Fail fast with guidance if missing.
DOCKER_COMPOSE ?= docker compose


.PHONY: compose-up compose-down compose-logs wait api test unit integration integration-noup e2e install env start worker dev dev-start dev-stop dev-logs dev-build dev-restart compose-api compose-all check-compose-v2 frontend frontend-install

check-compose-v2:
	@docker compose version >/dev/null 2>&1 || ( \
		echo "ERROR: Docker Compose v2 is not installed."; \
		echo ""; \
		echo "Install via official Docker repository (Ubuntu 22.04 Jammy):"; \
		echo "  sudo apt-get update"; \
		echo "  sudo apt-get install -y ca-certificates curl gnupg"; \
		echo "  sudo install -m 0755 -d /etc/apt/keyrings"; \
		echo "  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg"; \
		echo "  sudo chmod a+r /etc/apt/keyrings/docker.gpg"; \
		echo "  echo \"deb [arch=$$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu jammy stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null"; \
		echo "  sudo apt-get update"; \
		echo "  sudo apt-get install -y docker-compose-plugin"; \
		echo ""; \
		echo "Or install the standalone binary (x86_64):"; \
		echo "  sudo mkdir -p /usr/local/lib/docker/cli-plugins"; \
		echo "  sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose"; \
		echo "  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose"; \
		exit 1 \
	)


env:
	@echo "Loading .env if present"; \
	if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi; \
	true

# Production/Traditional Docker Compose commands
compose-up: check-compose-v2
	$(DOCKER_COMPOSE) up -d --no-recreate postgres redis minio

compose-api: check-compose-v2
	$(DOCKER_COMPOSE) up -d --no-recreate api worker

compose-all: check-compose-v2
	$(DOCKER_COMPOSE) up -d --no-recreate postgres redis minio api worker

compose-down: check-compose-v2
	$(DOCKER_COMPOSE) down

compose-logs: check-compose-v2
	$(DOCKER_COMPOSE) logs -f --tail=200

# Development environment with hot reload
dev-build: check-compose-v2
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

dev-stop: check-compose-v2
	@echo " Stopping development environment..."
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down --remove-orphans

dev-logs: check-compose-v2
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f --tail=100

dev-restart: check-compose-v2
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
	pytest -q -c backend/pyproject.toml

integration: compose-up
	. .venv/bin/activate; \
	export $$(grep -v '^#' backend/.env | xargs); \
	export ENVIRONMENT=development; \
	pytest -m "(integration or e2e) and not slow" -q -c backend/pyproject.toml

integration-noup:
	. .venv/bin/activate; \
	export ENVIRONMENT=development; \
	pytest -m "integration or e2e" -q -c backend/pyproject.toml

test: unit

e2e: integration

# Frontend commands
frontend-install:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

frontend: frontend-install
	@echo "🎨 Starting frontend dev server (Vite)..."
	@echo ""
	@echo "⚠️  Make sure backend is running on port 8200"
	@echo "   Run 'make api' in another terminal if not started"
	@echo ""
	cd frontend && npm run dev
