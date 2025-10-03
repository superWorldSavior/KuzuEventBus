"""Asynchronous query worker consuming Redis Streams and executing Kuzu queries.

This worker pops jobs from the queue, updates transaction status, restores DB if needed,
executes the query, then acknowledges the message.
"""
from __future__ import annotations

import asyncio
import io
import os
import tarfile
import tempfile
from pathlib import Path
from datetime import datetime, timezone
import json
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
from src.infrastructure.dependencies import (
    redis_connection,
    lock_service,
    file_storage_service,
    snapshot_repository,
)


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
        # Services for DB checkout (MinIO + Locks + Snapshots)
        self._locks = lock_service()
        self._storage = file_storage_service()
        self._snapshots = snapshot_repository()

    def stop(self) -> None:
        self._stopped.set()

    async def run_forever(self) -> None:
        infra_logger.info("Worker loop started", group=self._group, consumer=self._name)
        while not self._stopped.is_set():
            await self.run_once()
            await asyncio.sleep(1)  # Poll every second

    async def _ensure_local_db(self, tenant_id: UUID, database_id: UUID) -> Path:
        """Ensure the Kuzu DB files are present locally under KUZU_DATA_DIR.

        If absent, try to download the latest snapshot from MinIO and materialize it.
        Returns the expected path to the database file (data.kuzu).
        """
        base_dir = os.getenv("KUZU_DATA_DIR")
        if not base_dir:
            raise RuntimeError("KUZU_DATA_DIR must be set for query execution")

        db_dir = Path(base_dir) / str(tenant_id) / str(database_id)
        db_file = db_dir / "data.kuzu"

        # Fast path: already present
        if db_file.exists() or db_dir.exists():
            return db_file

        infra_logger.info(
            "Local DB not found; attempting checkout from snapshot",
            tenant_id=str(tenant_id),
            database_id=str(database_id),
        )

        # Find latest snapshot (ordered DESC by created_at in repo)
        snapshots = await self._snapshots.list_by_database(database_id, tenant_id)
        if not snapshots:
            infra_logger.warning(
                "No snapshots found for database; proceeding without restore",
                database_id=str(database_id),
            )
            # Ensure parent dir exists so Kuzu can initialize on first use
            db_dir.mkdir(parents=True, exist_ok=True)
            return db_file

        latest = snapshots[0]
        object_key = str(latest.get("object_key"))

        # Acquire a short lock for checkout to avoid concurrent restore
        lock_res = f"db:{database_id}:checkout"
        token: Optional[str] = None
        try:
            token = await self._locks.acquire_lock(lock_res, timeout_seconds=30)
            if not token:
                raise TimeoutError("Could not acquire database checkout lock")

            data = await self._storage.download_database(object_key)

            db_dir.mkdir(parents=True, exist_ok=True)

            # Heuristic by suffix; fall back to gzip signature check
            if object_key.endswith(".tar.gz") or (len(data) > 2 and data[:2] == b"\x1f\x8b"):
                # Extract tar.gz (directory snapshot)
                with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
                    # Extract under the parent of db_dir, then move if needed
                    # Most archives contain a single top-level directory
                    tar.extractall(path=db_dir.parent)
                infra_logger.info("Snapshot extracted", dest=str(db_dir.parent))
            else:
                # Single .kuzu file snapshot
                db_file.write_bytes(data)
                infra_logger.info("Snapshot materialized as file", path=str(db_file))

            return db_file
        finally:
            if token:
                await self._locks.release_lock(lock_res, token)

    def _is_mutating(self, cypher: str) -> bool:
        """Heuristic: detect if the Cypher query mutates state.

        MVP approach based on leading verb; can be improved with parser later.
        """
        q = cypher.strip().upper()
        mutators = (
            "CREATE",
            "MERGE",
            "DELETE",
            "SET ",
            "DROP",
            "ALTER",
            "INSERT",
            "UPDATE",
        )
        return q.startswith(mutators)

    async def _append_wal_entry(
        self,
        tenant_id: UUID,
        database_id: UUID,
        cypher: str,
        parameters: Optional[dict],
        results: Optional[list] = None,
    ) -> None:
        """Best-effort WAL append (MinIO log for PITR).

        Appends a single line to the WAL file for this minute.
        """
        ts = datetime.now(timezone.utc)
        ts_str = ts.strftime("%Y%m%dT%H%M%SZ")
        filename = f"wal/wal-{ts_str}.log"
        key = f"tenants/{tenant_id}/{database_id}/{filename}"

        entry = {
            "ts": ts.isoformat(),
            "query": cypher,
            "parameters": parameters or {},
            "results": results or [],
            "rows_returned": len(results) if results else 0,
        }
        line = (json.dumps(entry, default=str) + "\n").encode()

        lock_res = f"db:{database_id}:wal_append"
        token: Optional[str] = None
        try:
            token = await self._locks.acquire_lock(lock_res, timeout_seconds=10)
            if not token:
                infra_logger.warning("WAL append lock not acquired; skipping WAL write", database_id=str(database_id))
                return

            # Read existing content if any, then append
            prior: bytes = b""
            try:
                if await self._storage.file_exists(key):
                    prior = await self._storage.download_database(key)
            except Exception as e:  # noqa: BLE001
                infra_logger.warning("WAL read failed (proceeding with empty prior)", error=str(e))

            content = prior + line
            await self._storage.upload_database(tenant_id, database_id, content, filename)
            infra_logger.info("WAL entry appended", key=key)
        except Exception as e:  # noqa: BLE001
            infra_logger.warning("WAL append failed", error=str(e))
        finally:
            if token:
                await self._locks.release_lock(lock_res, token)

    async def run_once(self) -> None:
        try:
            msg = await self._queue.dequeue_transaction(self._group, self._name)
            if not msg:
                # Silenced: too verbose when polling every second
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
            # Ensure local DB exists (checkout from MinIO if needed)
            await self._ensure_local_db(tenant_id, database_id)
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

            # Write WAL entry for mutating queries (best-effort; errors are logged and ignored)
            try:
                params_dict = None if not parameters else json.loads(parameters)
                if self._is_mutating(query):
                    await self._append_wal_entry(tenant_id, database_id, query, params_dict, rows)
            except Exception as wal_err:  # noqa: BLE001
                infra_logger.warning("WAL write failure (ignored)", error=str(wal_err))
            
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
