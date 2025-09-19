from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

import pytest

from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    QueryExecutionService,
    TransactionRepository,
    TransactionStatus,
)
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
    def __init__(self, behavior: str = "ok") -> None:
        self.behavior = behavior

    async def execute_query(self, tenant_id: UUID, database_id: UUID, cypher: str, parameters: Optional[Dict[str, Any]] = None, timeout_seconds: int = 30) -> Dict[str, Any]:  # type: ignore[override]
        if self.behavior == "ok":
            return {"results": [{"ok": 1}], "execution_time_ms": 5}
        if self.behavior == "timeout":
            raise asyncio.TimeoutError("timeout")
        raise RuntimeError("boom")

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


@pytest.mark.asyncio
async def test_worker_completed_path():
    tenant_id = uuid4()
    db_id = uuid4()
    tx_id = uuid4()
    message = {
        "message_id": "1-0",
        "transaction_id": tx_id,
        "tenant_id": tenant_id,
        "priority": 0,
    }
    repo = FakeRepo(
        {
            "transaction_id": str(tx_id),
            "tenant_id": str(tenant_id),
            "database_id": str(db_id),
            "query": "RETURN 1 AS ok",
            "parameters": "{}",
            "timeout_seconds": "5",
        }
    )
    queue = FakeQueue(message)
    exec_adapter = FakeExec("ok")
    worker = QueryWorker(queue=queue, transactions=repo, executor=exec_adapter)

    await worker.run_once()

    assert (tx_id, TransactionStatus.RUNNING) in repo.updates
    assert (tx_id, TransactionStatus.COMPLETED) in repo.updates
    assert ("queries", "1-0") in queue.acked


@pytest.mark.asyncio
async def test_worker_failed_path():
    tenant_id = uuid4()
    db_id = uuid4()
    tx_id = uuid4()
    message = {"message_id": "2-0", "transaction_id": tx_id, "tenant_id": tenant_id, "priority": 0}
    repo = FakeRepo({"transaction_id": str(tx_id), "tenant_id": str(tenant_id), "database_id": str(db_id), "query": "X", "parameters": "{}", "timeout_seconds": "5"})
    queue = FakeQueue(message)
    exec_adapter = FakeExec("error")
    worker = QueryWorker(queue=queue, transactions=repo, executor=exec_adapter)

    await worker.run_once()

    assert (tx_id, TransactionStatus.FAILED) in repo.updates
    assert ("queries", "2-0") in queue.acked


@pytest.mark.asyncio
async def test_worker_timeout_path():
    tenant_id = uuid4()
    db_id = uuid4()
    tx_id = uuid4()
    message = {"message_id": "3-0", "transaction_id": tx_id, "tenant_id": tenant_id, "priority": 0}
    repo = FakeRepo({"transaction_id": str(tx_id), "tenant_id": str(tenant_id), "database_id": str(db_id), "query": "X", "parameters": "{}", "timeout_seconds": "1"})
    queue = FakeQueue(message)
    exec_adapter = FakeExec("timeout")
    worker = QueryWorker(queue=queue, transactions=repo, executor=exec_adapter)

    await worker.run_once()

    assert (tx_id, TransactionStatus.TIMEOUT) in repo.updates
    assert ("queries", "3-0") in queue.acked
