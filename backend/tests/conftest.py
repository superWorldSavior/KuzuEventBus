import os
import pytest
from fastapi.testclient import TestClient

from src.presentation.api.main import app


@pytest.fixture(scope="function")
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    # Ensure we always run in test env but without triggering in-memory fallbacks (already removed)
    monkeypatch.setenv("ENVIRONMENT", "test")
    # Anyio strict mode sometimes closes loop early if background tasks linger; relax policy if needed
    # but here we just give each test a fresh client context
    with TestClient(app) as c:
        yield c


@pytest.fixture
def anyio_backend():
    """Pin pytest-anyio backend to asyncio to avoid trio dependency."""
    return "asyncio"
