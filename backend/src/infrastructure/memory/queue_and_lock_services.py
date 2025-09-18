import asyncio
import heapq
import time
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from src.domain.shared.ports.query_execution import (
    MessageQueueService,
    DistributedLockService,
)


class InMemoryMessageQueueService(MessageQueueService):
    """In-memory prototype of a priority queue for transactions.

    NOT production-safe. Single-process only. Provides just enough behavior to
    validate higher-level orchestration before introducing Redis Streams.
    """

    def __init__(self) -> None:
        self._pq: List[Tuple[int, float, Dict[str, Any]]] = []
        self._cv = asyncio.Condition()

    async def enqueue_transaction(
        self, transaction_id: UUID, tenant_id: UUID, priority: int = 0
    ) -> bool:
        async with self._cv:
            heapq.heappush(
                self._pq,
                (priority, time.time(), {"transaction_id": transaction_id, "tenant_id": tenant_id}),
            )
            self._cv.notify()
        return True

    async def dequeue_transaction(
        self, consumer_group: str, consumer_name: str
    ) -> Optional[Dict[str, Any]]:
        async with self._cv:
            while not self._pq:
                await self._cv.wait()
            _prio, _ts, payload = heapq.heappop(self._pq)
            payload["consumer_group"] = consumer_group
            payload["consumer_name"] = consumer_name
            payload["message_id"] = f"mem-{int(time.time()*1000)}"
            return payload

    async def acknowledge_transaction(
        self, consumer_group: str, message_id: str
    ) -> bool:
        # No-op in memory (would trim pending list in real impl)
        return True

    async def publish_notification(
        self,
        tenant_id: UUID,
        transaction_id: UUID,
        event_type: str,
        data: Dict[str, Any],
    ) -> bool:
        # For prototype: simply print (could push to an internal list for tests)
        print(
            f"[INMEM-NOTIFY] tenant={tenant_id} tx={transaction_id} event={event_type} data={data}"
        )
        return True


class InMemoryDistributedLockService(DistributedLockService):
    """In-memory lock service (single-process, fake Redlock style)."""

    def __init__(self) -> None:
        self._locks: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def acquire_lock(
        self, resource: str, timeout_seconds: int = 10
    ) -> Optional[str]:
        async with self._lock:
            now = time.time()
            entry = self._locks.get(resource)
            if entry and entry["expires_at"] > now:
                return None
            token = f"lk-{int(now*1000)}"
            self._locks[resource] = {"token": token, "expires_at": now + timeout_seconds}
            return token

    async def release_lock(self, resource: str, token: str) -> bool:
        async with self._lock:
            entry = self._locks.get(resource)
            if not entry:
                return False
            if entry["token"] != token:
                return False
            del self._locks[resource]
            return True

    async def extend_lock(
        self, resource: str, token: str, extend_seconds: int
    ) -> bool:
        async with self._lock:
            entry = self._locks.get(resource)
            if not entry or entry["token"] != token:
                return False
            entry["expires_at"] += extend_seconds
            return True
