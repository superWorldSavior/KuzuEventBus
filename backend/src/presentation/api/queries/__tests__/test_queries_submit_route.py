from __future__ import annotations

import json
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from src.presentation.api.main import app
from src.presentation.api.context.request_context import RequestContext
from src.presentation.api.context.request_context import get_request_context as real_get_ctx
import src.infrastructure.dependencies as deps
from src.presentation.api.middleware.authentication import AuthenticationMiddleware


class _FakeQueue:
    async def enqueue_transaction(self, transaction_id: UUID, tenant_id: UUID, priority: int = 0) -> bool:
        return True

    async def dequeue_transaction(self, consumer_group: str, consumer_name: str):
        return None

    async def acknowledge_transaction(self, consumer_group: str, message_id: str) -> bool:
        return True

    async def publish_notification(self, tenant_id: UUID, transaction_id: UUID, event_type: str, data):
        return True


class _FakeRepo:
    async def save_transaction(self, transaction_id: UUID, tenant_id: UUID, database_id: UUID, query: str, parameters, status, timeout_seconds: int) -> UUID:
        return transaction_id

    async def find_by_id(self, transaction_id: UUID):
        return None

    async def find_by_tenant(self, tenant_id: UUID, limit: int = 100, offset: int = 0):
        return []

    async def find_running_transactions(self):
        return []

    async def update_status(self, transaction_id: UUID, status, result_count: int = 0, error_message: str | None = None) -> bool:
        return True


def _override_ctx():
    # fixed tenant context for tests
    return RequestContext(tenant_id=uuid4(), tenant_name="t", api_key_suffix="x", permissions=[])


@pytest.fixture(autouse=True)
def _override_deps(monkeypatch):
    # override context dependency at FastAPI level
    app.dependency_overrides[real_get_ctx] = _override_ctx
    # override infra deps
    monkeypatch.setattr(deps, "message_queue_service", lambda: _FakeQueue())
    monkeypatch.setattr(deps, "transaction_repository", lambda: _FakeRepo())
    # bypass auth middleware for unit scope
    monkeypatch.setattr(AuthenticationMiddleware, "_requires_auth", lambda self, path: False, raising=False)
    yield
    app.dependency_overrides.clear()


def test_submit_query_returns_202(monkeypatch):
    client = TestClient(app)
    db_id = uuid4()
    body = {"query": "RETURN 1 AS ok", "parameters": {}, "timeout_seconds": 5}
    resp = client.post(f"/api/v1/databases/{db_id}/query", json=body)
    assert resp.status_code == 202, resp.text
    data = resp.json()
    assert "transaction_id" in data
    # validate UUID
    UUID(str(data["transaction_id"]))
