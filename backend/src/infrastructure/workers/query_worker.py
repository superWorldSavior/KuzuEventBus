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
from src.domain.shared.ports import CacheService
from src.infrastructure.logging.config import infra_logger
from src.infrastructure.dependencies import redis_connection


class QueryWorker:
    def __init__(
        self,
        queue: MessageQueueService,
        transactions: TransactionRepository,
        executor: QueryExecutionService,
        cache: CacheService,
        consumer_group: str = "queries",
        consumer_name: str = "worker-1",
    ) -> None:
        self._queue = queue
        self._tx = transactions
        self._exec = executor
        self._cache = cache
        self._group = consumer_group
        self._name = consumer_name
        self._stopped = asyncio.Event()
        # Redis connection for events stream (SSE catch-up)
        self._events_redis = redis_connection()

    def stop(self) -> None:
        self._stopped.set()

    async def run_forever(self) -> None:
        infra_logger.info("Worker loop started", group=self._group, consumer=self._name)
        while not self._stopped.is_set():
            await self.run_once()
            await asyncio.sleep(1)  # Poll every second

    async def run_once(self) -> None:
        try:
            msg = await self._queue.dequeue_transaction(self._group, self._name)
            if not msg:
                infra_logger.debug("No message in queue", group=self._group, consumer=self._name)
                return
            infra_logger.info("Dequeued message", message_id=msg.get("message_id"), tx_id=msg.get("transaction_id"))
            message_id = msg["message_id"]
            tx_id: UUID = msg["transaction_id"]
            tenant_id: UUID = msg["tenant_id"]
            infra_logger.info("Processing transaction", tx_id=str(tx_id), tenant_id=str(tenant_id))

            # Load transaction details
            infra_logger.debug("Loading transaction from repository", tx_id=str(tx_id))
            tx = await self._tx.find_by_id(tx_id)
            infra_logger.debug("Transaction loaded", found=tx is not None)
            if not tx:
                infra_logger.error("Transaction not found for dequeued message", tx_id=str(tx_id))
                await self._queue.acknowledge_transaction(self._group, message_id)
                return

            database_id = UUID(tx["database_id"])  # type: ignore[arg-type]
            infra_logger.debug("Database ID extracted", database_id=str(database_id))
            query = tx["query"]
            infra_logger.debug("Query extracted", query_len=len(query))
            parameters = tx.get("parameters")
            infra_logger.debug("Query extracted")
            infra_logger.info(f"Executing query: {query[:500]}")  # Log first 500 chars
            infra_logger.debug("Updating status to RUNNING")
            await self._tx.update_status(tx_id, TransactionStatus.RUNNING)
            infra_logger.info("Starting query execution")
            # Execute
            try:
                infra_logger.debug("Query execution started")
                result = await self._exec.execute_query(
                    tenant_id=tenant_id,
                    database_id=database_id,
                    cypher=query,
                    parameters=None if not parameters else __import__("json").loads(parameters),
                    timeout_seconds=int(tx.get("timeout_seconds", "30")),
                )
                infra_logger.info("Query executed successfully", result_type=type(result).__name__)
                # Log result structure explicitly for debugging
                if isinstance(result, dict):
                    infra_logger.info(f"Raw Kuzu result keys: {list(result.keys())}")
                    infra_logger.info(f"Raw Kuzu result.results type: {type(result.get('results'))}, len: {len(result.get('results', []))}")
                    if result.get('results'):
                        infra_logger.info(f"First result item: {result['results'][0] if result['results'] else 'N/A'}")
                else:
                    infra_logger.info(f"Raw Kuzu result (non-dict): {result}")
            except Exception as exec_err:
                infra_logger.error("Query execution crashed", error=str(exec_err), error_type=type(exec_err).__name__)
                raise
            # Normalize rows from various result shapes
            rows = []
            if isinstance(result, dict):
                try:
                    if isinstance(result.get("results"), list):
                        rows = result.get("results", [])  # flat list
                    elif isinstance(result.get("results"), dict) and isinstance(result["results"].get("rows"), list):
                        rows = result["results"].get("rows", [])  # nested under results.rows
                    elif isinstance(result.get("rows"), list):
                        rows = result.get("rows", [])  # rows at top-level
                    elif isinstance(result.get("data"), list):
                        rows = result.get("data", [])  # generic data list
                except Exception as parse_err:
                    infra_logger.error("Failed to parse query rows", error=str(parse_err))

            infra_logger.info("Results extracted", row_count=len(rows), raw_preview=rows[:3] if rows else "empty")
            
            infra_logger.debug("Updating transaction status to COMPLETED")
            await self._tx.update_status(
                tx_id,
                TransactionStatus.COMPLETED,
                result_count=len(rows),
                error_message=None,
            )
            infra_logger.info("Status updated to COMPLETED")
            
            # Store results in cache for later retrieval (TTL: 1 hour)
            infra_logger.debug("Caching results", cache_key=f"tx_results:{tx_id}")
            try:
                await self._cache.set(f"tx_results:{tx_id}", {"results": rows}, expire_seconds=3600)
                infra_logger.info("Results cached successfully")
            except Exception as cache_err:
                infra_logger.error("Failed to cache query results", error=str(cache_err), tx_id=str(tx_id))
            
            infra_logger.debug("Emitting SSE event", tenant_id=str(tenant_id), tx_id=str(tx_id))
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
            infra_logger.info("SSE event emitted to stream", stream=f"events:{tenant_id}", tx_id=str(tx_id))
            
            infra_logger.debug("Acknowledging message")
            await self._queue.acknowledge_transaction(self._group, message_id)
            infra_logger.info("Message acknowledged - query processing complete!")
        except asyncio.TimeoutError as exc:
            infra_logger.error("Query timeout", tx_id=str(tx_id), error=str(exc))
            await self._tx.update_status(tx_id, TransactionStatus.TIMEOUT, error_message=str(exc))
            await self._emit_event(
                tenant_id,
                "timeout",
                {"transaction_id": str(tx_id), "database_id": str(database_id), "error": str(exc)},
            )
            await self._queue.acknowledge_transaction(self._group, message_id)
        except Exception as exc:  # noqa: BLE001
            infra_logger.error("Query execution failed", tx_id=str(tx_id), error=str(exc))
            await self._tx.update_status(tx_id, TransactionStatus.FAILED, error_message=str(exc))
            await self._emit_event(
                tenant_id,
                "failed",
                {"transaction_id": str(tx_id), "database_id": str(database_id), "error": str(exc)},
            )
            await self._queue.acknowledge_transaction(self._group, message_id)
        except Exception as fatal_exc:
            infra_logger.error("Fatal error in worker run_once", error=str(fatal_exc), error_type=type(fatal_exc).__name__)
            import traceback
            infra_logger.error("Traceback", traceback=traceback.format_exc())

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
