"""Asynchronous query worker consuming Redis Streams and executing Kuzu queries.

This worker pops jobs from the queue, updates transaction status, restores DB if needed,
executes the query, then acknowledges the message.
"""
from __future__ import annotations

import asyncio
from typing import Optional
from uuid import UUID

from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    QueryExecutionService,
    TransactionRepository,
    TransactionStatus,
)
from src.infrastructure.logging.config import infra_logger
from src.infrastructure.dependencies import redis_connection


class QueryWorker:
    def __init__(
        self,
        queue: MessageQueueService,
        transactions: TransactionRepository,
        executor: QueryExecutionService,
        consumer_group: str = "queries",
        consumer_name: str = "worker-1",
    ) -> None:
        self._queue = queue
        self._tx = transactions
        self._exec = executor
        self._group = consumer_group
        self._name = consumer_name
        self._stopped = asyncio.Event()
        # Redis connection for events stream (SSE catch-up)
        self._events_redis = redis_connection()

    def stop(self) -> None:
        self._stopped.set()

    async def run_forever(self) -> None:
        while not self._stopped.is_set():
            await self.run_once()

    async def run_once(self) -> None:
        msg = await self._queue.dequeue_transaction(self._group, self._name)
        if not msg:
            return
        message_id = msg["message_id"]
        tx_id: UUID = msg["transaction_id"]
        tenant_id: UUID = msg["tenant_id"]

        # Load transaction details
        tx = await self._tx.find_by_id(tx_id)
        if not tx:
            infra_logger.error("Transaction not found for dequeued message", tx_id=str(tx_id))
            await self._queue.acknowledge_transaction(self._group, message_id)
            return

        database_id = UUID(tx["database_id"])  # type: ignore[arg-type]
        query = tx["query"]
        parameters = tx.get("parameters")
        try:
            await self._tx.update_status(tx_id, TransactionStatus.RUNNING)
            # Execute
            result = await self._exec.execute_query(
                tenant_id=tenant_id,
                database_id=database_id,
                cypher=query,
                parameters=None if not parameters else __import__("json").loads(parameters),
                timeout_seconds=int(tx.get("timeout_seconds", "30")),
            )
            rows = result.get("results", []) if isinstance(result, dict) else []
            await self._tx.update_status(
                tx_id,
                TransactionStatus.COMPLETED,
                result_count=len(rows),
                error_message=None,
            )
            await self._emit_event(
                tenant_id,
                "completed",
                {
                    "transaction_id": str(tx_id),
                    "database_id": str(database_id),
                    "rows_count": str(len(rows)),
                    "execution_time_ms": str(result.get("execution_time_ms", 0) if isinstance(result, dict) else 0),
                },
            )
            await self._queue.acknowledge_transaction(self._group, message_id)
        except asyncio.TimeoutError as exc:
            await self._tx.update_status(tx_id, TransactionStatus.TIMEOUT, error_message=str(exc))
            await self._emit_event(
                tenant_id,
                "timeout",
                {"transaction_id": str(tx_id), "database_id": str(database_id), "error": str(exc)},
            )
            await self._queue.acknowledge_transaction(self._group, message_id)
        except Exception as exc:  # noqa: BLE001
            await self._tx.update_status(tx_id, TransactionStatus.FAILED, error_message=str(exc))
            await self._emit_event(
                tenant_id,
                "failed",
                {"transaction_id": str(tx_id), "database_id": str(database_id), "error": str(exc)},
            )
            await self._queue.acknowledge_transaction(self._group, message_id)

    async def _emit_event(self, tenant_id: UUID, event_type: str, data: dict) -> None:
        """Append event to Redis Stream for SSE catch-up.

        Stream key pattern: events:{tenant_id}
        Trim with MAXLEN to keep history bounded.
        """
        try:
            fields = {"event_type": event_type}
            fields.update({k: (v if isinstance(v, str) else str(v)) for k, v in data.items()})
            await self._events_redis.xadd(
                name=f"events:{tenant_id}",
                fields=fields,
                maxlen=10000,
                approximate=True,
            )
        except Exception as exc:  # noqa: BLE001
            infra_logger.error("Failed to emit SSE event", error=str(exc))
