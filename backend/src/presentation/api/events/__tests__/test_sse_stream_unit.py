from __future__ import annotations

import asyncio
import json
from typing import Dict, List, Tuple

import pytest
from starlette.testclient import TestClient

from src.presentation.api.main import app
from src.presentation.api.events import routes as events_routes
from uuid import uuid4
from src.presentation.api.context.request_context import RequestContext
from src.presentation.api.context.request_context import get_request_context as real_get_ctx
from src.presentation.api.middleware.authentication import AuthenticationMiddleware


class _FakeRedis:
    def __init__(self, batches: List[List[Tuple[str, Dict[str, str]]]]):
        # batches: list of message lists; each message is (entry_id, fields)
        self._batches = batches
        self._index = 0

    async def xread(self, streams: Dict[str, str], block: int = 0, count: int = 1):  # type: ignore[override]
        await asyncio.sleep(0)  # yield control
        if self._index >= len(self._batches):
            return []
        batch = self._batches[self._index]
        self._index += 1
        # xread returns list of (stream_key, [(entry_id, fields), ...])
        key = next(iter(streams.keys()))
        return [(key, batch)]


def _override_ctx():
    # stream key will be events:{tenant_id}
    return RequestContext(tenant_id=uuid4(), tenant_name="t", api_key_suffix="x", permissions=[])


@pytest.fixture(autouse=True)
def _override_deps(monkeypatch):
    # override RequestContext dep
    app.dependency_overrides[real_get_ctx] = _override_ctx
    # bypass auth middleware for unit scope
    monkeypatch.setattr(AuthenticationMiddleware, "_requires_auth", lambda self, path: False, raising=False)
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_sse_stream_formats_events(monkeypatch):
    fake = _FakeRedis([
        [("1-0", {"event_type": "completed", "transaction_id": "tx1", "database_id": "db1", "rows_count": "1"})],
        [("2-0", {"event_type": "failed", "transaction_id": "tx2", "database_id": "db1", "error": "boom"})],
    ])
    monkeypatch.setattr(events_routes, "redis_connection", lambda: fake)
    # Call the async generator directly to avoid HTTP streaming buffering issues
    tenant_stream = f"events:{uuid4()}"
    agen = events_routes._sse_stream(fake, tenant_stream, "0-0")
    collected: list[bytes] = []
    # We expect for two entries: for each entry, SSE yields id, event, data lines + a blank line
    for _ in range(8):
        chunk = await agen.__anext__()
        collected.append(chunk)
    txt = b"".join(collected).decode("utf-8")
    assert "id: 1-0" in txt
    assert "event: completed" in txt
    assert "id: 2-0" in txt
    assert "event: failed" in txt
