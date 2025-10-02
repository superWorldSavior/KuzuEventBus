from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

import pytest

from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    QueryExecutionService,
    TransactionRepository,
    TransactionStatus,
)
from src.infrastructure.workers import query_worker as qw_mod
from src.infrastructure.workers.query_worker import QueryWorker


class FakeQueue(MessageQueueService):
    def __init__(self, message: Optional[Dict[str, Any]] = None) -> None:
        self._message = message
        self.acked: list[tuple[str, str]] = []

    async def enqueue_transaction(self, transaction_id: UUID, tenant_id: UUID, priority: int = 0) -> bool:  # type: ignore[override]
        return True

    async def dequeue_transaction(self, consumer_group: str, consumer_name: str) -> Optional[Dict[str, Any]]:  # type: ignore[override]
        msg, self._message = self._message, None
        return msg

    async def acknowledge_transaction(self, consumer_group: str, message_id: str) -> bool:  # type: ignore[override]
        self.acked.append((consumer_group, message_id))
        return True

    async def publish_notification(self, tenant_id: UUID, transaction_id: UUID, event_type: str, data: Dict[str, Any]) -> bool:  # type: ignore[override]
        return True


class FakeExec(QueryExecutionService):
    async def execute_query(self, tenant_id: UUID, database_id: UUID, cypher: str, parameters: Optional[Dict[str, Any]] = None, timeout_seconds: int = 30) -> Dict[str, Any]:  # type: ignore[override]
        return {"results": [{"ok": 1}], "execution_time_ms": 5}

    async def explain_query(self, tenant_id: UUID, database_id: UUID, cypher: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:  # type: ignore[override]
        return {"plan": "mock"}


class FakeRepo(TransactionRepository):
    def __init__(self, tx: Dict[str, Any]) -> None:
        self._tx = tx
        self.updates: list[tuple[UUID, TransactionStatus]] = []

    async def save_transaction(self, *args, **kwargs) -> UUID:  # type: ignore[override]
        raise NotImplementedError

    async def find_by_id(self, transaction_id: UUID) -> Optional[Dict[str, Any]]:  # type: ignore[override]
        return self._tx

    async def find_by_tenant(self, tenant_id: UUID, limit: int = 100, offset: int = 0) -> list[Dict[str, Any]]:  # type: ignore[override]
        return []

    async def find_running_transactions(self) -> list[Dict[str, Any]]:  # type: ignore[override]
        return []

    async def update_status(self, transaction_id: UUID, status: TransactionStatus, result_count: int = 0, error_message: Optional[str] = None) -> bool:  # type: ignore[override]
        self.updates.append((transaction_id, status))
        return True


class FakeLocks:
    async def acquire_lock(self, resource: str, timeout_seconds: int = 10) -> Optional[str]:
        return "token"

    async def release_lock(self, resource: str, token: str) -> bool:
        return True


class FakeSnapshots:
    async def list_by_database(self, database_id: UUID, tenant_id: UUID = None):  # type: ignore[override]
        # Return empty list to force worker to create directory structure without restore
        return []


class FakeStorage:
    async def download_database(self, file_path: str) -> bytes:  # type: ignore[override]
        return b""


@pytest.mark.asyncio
async def test_worker_checkout_creates_local_db_structure(monkeypatch: pytest.MonkeyPatch):
    # Arrange
    temp_dir = tempfile.mkdtemp()
    monkeypatch.setenv("KUZU_DATA_DIR", temp_dir)

    tenant_id = uuid4()
    db_id = uuid4()
    tx_id = uuid4()

    message = {"message_id": "10-0", "transaction_id": tx_id, "tenant_id": tenant_id, "priority": 0}
    repo = FakeRepo({
        "transaction_id": str(tx_id),
        "tenant_id": str(tenant_id),
        "database_id": str(db_id),
        "query": "RETURN 1 AS ok",
        "parameters": "{}",
        "timeout_seconds": "5",
    })
    queue = FakeQueue(message)

    # Patch infra dependencies used inside the module
    monkeypatch.setattr(qw_mod, "lock_service", lambda: FakeLocks())
    monkeypatch.setattr(qw_mod, "file_storage_service", lambda: FakeStorage())
    monkeypatch.setattr(qw_mod, "snapshot_repository", lambda: FakeSnapshots())

    exec_adapter = FakeExec()

    # Provide a dummy cache object (unused in this path)
    dummy_cache = object()

    worker = QueryWorker(queue=queue, transactions=repo, executor=exec_adapter, cache=dummy_cache)

    # Act
    try:
        await worker.run_once()

        # Assert: directory should exist under KUZU_DATA_DIR/<tenant>/<db>/
        expected_dir = Path(temp_dir) / str(tenant_id) / str(db_id)
        assert expected_dir.exists(), f"Expected local DB dir {expected_dir} to be created"

        # And worker should progress statuses and ack message
        assert (tx_id, TransactionStatus.RUNNING) in repo.updates
        assert (tx_id, TransactionStatus.COMPLETED) in repo.updates
        assert ("queries", "10-0") in queue.acked
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
