#!/usr/bin/env bash
set -euo pipefail

POSTGRES_URL=${DATABASE_URL:-"postgresql://kuzu_user:kuzu_password@localhost:5432/kuzu_eventbus"}
REDIS_URL=${REDIS_URL:-"redis://localhost:6379/0"}
MINIO_ENDPOINT=${MINIO_ENDPOINT:-"localhost:9000"}

echo "Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker exec $({ docker ps --format '{{.Names}}' | grep postgres || true; }) pg_isready -U kuzu_user -d kuzu_eventbus >/dev/null 2>&1; then
    echo "PostgreSQL is ready"; break; fi; sleep 2; done

echo "Waiting for Redis..."
for i in {1..30}; do
  if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then echo "Redis is ready"; break; fi; sleep 2; done

echo "Waiting for MinIO..."
for i in {1..60}; do
  if curl -sf "http://${MINIO_ENDPOINT}/minio/health/live" >/dev/null; then echo "MinIO is ready"; break; fi; sleep 2; done

echo "All services are healthy."

