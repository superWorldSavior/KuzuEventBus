from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

import pytest

from src.application.usecases.submit_async_query import (
    SubmitAsyncQueryRequest,
    SubmitAsyncQueryUseCase,
)
from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    TransactionRepository,
    TransactionStatus,
)


class FakeQueue(MessageQueueService):
    def __init__(self) -> None:
        self.enqueued: list[tuple[UUID, UUID, int]] = []

    async def enqueue_transaction(self, transaction_id: UUID, tenant_id: UUID, priority: int = 0) -> bool:  # type: ignore[override]
        self.enqueued.append((transaction_id, tenant_id, priority))
        return True

    async def dequeue_transaction(self, consumer_group: str, consumer_name: str) -> Optional[Dict[str, Any]]:
        return None

    async def acknowledge_transaction(self, consumer_group: str, message_id: str) -> bool:
        return True

    async def publish_notification(self, tenant_id: UUID, transaction_id: UUID, event_type: str, data: Dict[str, Any]) -> bool:
        return True


@dataclass
class SavedTx:
    transaction_id: UUID
    tenant_id: UUID
    database_id: UUID
    query: str
    parameters: Dict[str, Any]
    status: TransactionStatus
    timeout_seconds: int


class FakeTxRepo(TransactionRepository):
    def __init__(self) -> None:
        self.saved: list[SavedTx] = []

    async def save_transaction(self, transaction_id: UUID, tenant_id: UUID, database_id: UUID, query: str, parameters: Dict[str, Any], status: TransactionStatus, timeout_seconds: int) -> UUID:  # type: ignore[override]
        self.saved.append(SavedTx(transaction_id, tenant_id, database_id, query, parameters, status, timeout_seconds))
        return transaction_id

    async def find_by_id(self, transaction_id: UUID) -> Optional[Dict[str, Any]]:
        return None

    async def find_by_tenant(self, tenant_id: UUID, limit: int = 100, offset: int = 0) -> list[Dict[str, Any]]:
        return []

    async def find_running_transactions(self) -> list[Dict[str, Any]]:
        return []

    async def update_status(self, transaction_id: UUID, status: TransactionStatus, result_count: int = 0, error_message: Optional[str] = None) -> bool:
        return True


@pytest.mark.asyncio
async def test_submit_async_query_saves_tx_and_enqueues():
    queue = FakeQueue()
    repo = FakeTxRepo()
    usecase = SubmitAsyncQueryUseCase(queue=queue, transactions=repo)

    tenant_id = uuid4()
    db_id = uuid4()
    req = SubmitAsyncQueryRequest(
        tenant_id=tenant_id,
        database_id=db_id,
        query="RETURN 1 AS ok",
        parameters={"a": 1},
        timeout_seconds=5,
        priority=2,
    )

    res = await usecase.execute(req)

    # Validate tx saved
    assert len(repo.saved) == 1
    saved = repo.saved[0]
    assert saved.tenant_id == tenant_id
    assert saved.database_id == db_id
    assert saved.query == "RETURN 1 AS ok"
    assert saved.parameters == {"a": 1}
    assert saved.status == TransactionStatus.PENDING
    assert saved.timeout_seconds == 5

    # Validate enqueue
    assert len(queue.enqueued) == 1
    q_tx_id, q_tenant, q_prio = queue.enqueued[0]
    assert q_tenant == tenant_id
    assert q_prio == 2
    assert q_tx_id == res.transaction_id
