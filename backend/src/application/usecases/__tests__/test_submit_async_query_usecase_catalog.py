from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
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
from src.domain.shared.ports.query_catalog import QueryCatalogRepository


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


class FakeQueryCatalog(QueryCatalogRepository):
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def increment_usage(self, *, tenant_id: UUID, database_id: UUID, query_text: str, query_hash: str, used_at: datetime) -> None:
        self.calls.append({
            "method": "increment_usage",
            "tenant_id": tenant_id,
            "database_id": database_id,
            "query_text": query_text,
            "query_hash": query_hash,
            "used_at": used_at,
        })

    async def list_most_used(self, *, tenant_id: UUID, database_id: UUID, limit: int = 10):  # type: ignore[override]
        return []

    async def add_favorite(self, *, tenant_id: UUID, database_id: UUID, query_text: str, query_hash: str) -> None:
        self.calls.append({"method": "add_favorite"})

    async def remove_favorite(self, *, tenant_id: UUID, database_id: UUID, query_hash: str) -> bool:
        self.calls.append({"method": "remove_favorite"})
        return True

    async def list_favorites(self, *, tenant_id: UUID, database_id: UUID):  # type: ignore[override]
        return []


@pytest.mark.asyncio
async def test_submit_async_query_increments_usage_in_catalog():
    queue = FakeQueue()
    repo = FakeTxRepo()
    catalog = FakeQueryCatalog()

    usecase = SubmitAsyncQueryUseCase(queue=queue, transactions=repo, query_catalog=catalog)

    tenant_id = uuid4()
    db_id = uuid4()
    req = SubmitAsyncQueryRequest(
        tenant_id=tenant_id,
        database_id=db_id,
        query="MATCH (n) RETURN n",
        parameters=None,
        timeout_seconds=5,
        priority=0,
    )

    await usecase.execute(req)

    assert any(c["method"] == "increment_usage" for c in catalog.calls)
    call = next(c for c in catalog.calls if c["method"] == "increment_usage")
    assert call["tenant_id"] == tenant_id
    assert call["database_id"] == db_id
    assert call["query_text"] == "MATCH (n) RETURN n"  # normalized later in adapter if desired
    assert isinstance(call["query_hash"], str)
    assert len(call["query_hash"]) >= 12
    assert isinstance(call["used_at"], datetime)
