SHELL := /bin/bash

.PHONY: compose-up compose-down compose-logs wait api test unit integration e2e install env start worker

env:
	@echo "Loading .env if present"; \
	if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi; \
	true

compose-up:
	docker-compose up -d postgres redis minio

compose-down:
	docker-compose down

compose-logs:
	docker-compose logs -f --tail=200

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

