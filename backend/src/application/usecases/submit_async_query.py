"""Use case to submit an async query execution request via queue.

Encapsulates: transaction creation (PENDING) + enqueue on message queue.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional
from uuid import UUID, uuid4

from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    TransactionRepository,
    TransactionStatus,
)


@dataclass(frozen=True)
class SubmitAsyncQueryRequest:
    tenant_id: UUID
    database_id: UUID
    query: str
    parameters: Optional[Dict] = None
    timeout_seconds: int = 30
    priority: int = 0


@dataclass(frozen=True)
class SubmitAsyncQueryResponse:
    transaction_id: UUID


class SubmitAsyncQueryUseCase:
    def __init__(
        self,
        queue: MessageQueueService,
        transactions: TransactionRepository,
    ) -> None:
        self._queue = queue
        self._tx = transactions

    async def execute(self, req: SubmitAsyncQueryRequest) -> SubmitAsyncQueryResponse:
        tx_id = uuid4()
        await self._tx.save_transaction(
            transaction_id=tx_id,
            tenant_id=req.tenant_id,
            database_id=req.database_id,
            query=req.query,
            parameters=req.parameters or {},
            status=TransactionStatus.PENDING,
            timeout_seconds=req.timeout_seconds,
        )
        await self._queue.enqueue_transaction(
            transaction_id=tx_id,
            tenant_id=req.tenant_id,
            priority=req.priority,
        )
        return SubmitAsyncQueryResponse(transaction_id=tx_id)
