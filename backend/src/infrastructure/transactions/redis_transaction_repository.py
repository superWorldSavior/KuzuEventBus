"""Redis-backed implementation of TransactionRepository.

Uses Redis Hashes to store transaction records and Sets for simple indexing
(by tenant and by running status). This is an MVP suitable for async query
execution; it can be swapped to Postgres later without changing the domain.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from redis.asyncio import Redis

from src.domain.shared.ports.query_execution import (
    TransactionRepository,
    TransactionStatus,
)


class RedisTransactionRepository(TransactionRepository):
    def __init__(self, redis: Redis, prefix: str = "tx:") -> None:
        self._redis = redis
        self._prefix = prefix

    def _key(self, transaction_id: UUID) -> str:
        return f"{self._prefix}{transaction_id}"

    def _tenant_set(self, tenant_id: UUID) -> str:
        return f"{self._prefix}tenant:{tenant_id}:ids"

    def _running_set(self) -> str:
        return f"{self._prefix}running"

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(tz=timezone.utc).isoformat()

    async def save_transaction(
        self,
        transaction_id: UUID,
        tenant_id: UUID,
        database_id: UUID,
        query: str,
        parameters: Dict[str, Any],
        status: TransactionStatus,
        timeout_seconds: int,
    ) -> UUID:
        key = self._key(transaction_id)
        created = self._now_iso()
        fields = {
            "transaction_id": str(transaction_id),
            "tenant_id": str(tenant_id),
            "database_id": str(database_id),
            "query": query,
            "parameters": json.dumps(parameters or {}),
            "status": status.value,
            "timeout_seconds": str(timeout_seconds),
            "created_at": created,
            "updated_at": created,
            "result_count": "0",
            "error_message": "",
        }
        await self._redis.hset(key, mapping=fields)
        # Indexes
        await self._redis.sadd(self._tenant_set(tenant_id), str(transaction_id))
        if status == TransactionStatus.RUNNING:
            await self._redis.sadd(self._running_set(), str(transaction_id))
        return transaction_id

    async def find_by_id(self, transaction_id: UUID) -> Optional[Dict[str, Any]]:
        data = await self._redis.hgetall(self._key(transaction_id))
        if not data:
            return None
        # Redis returns bytes when decode_responses=False; our client uses decode_responses=True elsewhere.
        return {k: v for k, v in data.items()}

    async def find_by_tenant(self, tenant_id: UUID, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        ids = await self._redis.smembers(self._tenant_set(tenant_id))
        # Simple pagination in-memory for MVP
        id_list = list(ids)
        slice_ids = id_list[offset : offset + limit]
        pipe = self._redis.pipeline()
        for tid in slice_ids:
            pipe.hgetall(self._key(UUID(tid)))
        rows = await pipe.execute()
        return [row for row in rows if row]

    async def find_running_transactions(self) -> List[Dict[str, Any]]:
        ids = await self._redis.smembers(self._running_set())
        pipe = self._redis.pipeline()
        for tid in ids:
            pipe.hgetall(self._key(UUID(tid)))
        rows = await pipe.execute()
        return [row for row in rows if row]

    async def update_status(
        self,
        transaction_id: UUID,
        status: TransactionStatus,
        result_count: int = 0,
        error_message: Optional[str] = None,
    ) -> bool:
        key = self._key(transaction_id)
        exists = await self._redis.exists(key)
        if not exists:
            return False
        updated = self._now_iso()
        mapping = {
            "status": status.value,
            "updated_at": updated,
            "result_count": str(result_count),
            "error_message": error_message or "",
        }
        # Derive timing fields based on status transitions (best-effort)
        if status == TransactionStatus.RUNNING:
            mapping["started_at"] = updated
        elif status in (TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.TIMEOUT):
            mapping["completed_at"] = updated
        await self._redis.hset(key, mapping=mapping)
        # Maintain running set membership
        if status == TransactionStatus.RUNNING:
            await self._redis.sadd(self._running_set(), str(transaction_id))
        else:
            await self._redis.srem(self._running_set(), str(transaction_id))
        return True
