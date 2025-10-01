"""Use case to submit an async query execution request via queue.

Encapsulates: transaction creation (PENDING) + enqueue on message queue.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional
from uuid import UUID, uuid4

from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    TransactionRepository,
    TransactionStatus,
)
from src.domain.shared.ports.query_catalog import QueryCatalogRepository
from src.domain.query_catalog.value_objects import QueryText, QueryHash
from src.infrastructure.logging.config import infra_logger


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
        query_catalog: Optional[QueryCatalogRepository] = None,
    ) -> None:
        self._queue = queue
        self._tx = transactions
        self._catalog = query_catalog

    async def execute(self, req: SubmitAsyncQueryRequest) -> SubmitAsyncQueryResponse:
        tx_id = uuid4()
        infra_logger.info("Saving transaction to repository", tx_id=str(tx_id), database_id=str(req.database_id))
        await self._tx.save_transaction(
            transaction_id=tx_id,
            tenant_id=req.tenant_id,
            database_id=req.database_id,
            query=req.query,
            parameters=req.parameters or {},
            status=TransactionStatus.PENDING,
            timeout_seconds=req.timeout_seconds,
        )
        infra_logger.info("Transaction saved", tx_id=str(tx_id))
        
        # Record usage in catalog if available (fail fast but non-blocking)
        if self._catalog is not None:
            try:
                qt = QueryText(req.query)
                qh = QueryHash.from_query_text(qt)
                await self._catalog.increment_usage(
                    tenant_id=req.tenant_id,
                    database_id=req.database_id,
                    query_text=qt.value,
                    query_hash=qh.value,
                    used_at=datetime.utcnow(),
                )
                infra_logger.debug("Query recorded in catalog", query_hash=qh.value)
            except Exception as e:
                # Do not block submission if catalog write fails
                infra_logger.warning("Failed to record query in catalog", error=str(e))
                
        infra_logger.info("Enqueuing transaction", tx_id=str(tx_id), tenant_id=str(req.tenant_id))
        result = await self._queue.enqueue_transaction(
            transaction_id=tx_id,
            tenant_id=req.tenant_id,
            priority=req.priority,
        )
        infra_logger.info("Transaction enqueued", tx_id=str(tx_id), result=result)
        return SubmitAsyncQueryResponse(transaction_id=tx_id)
