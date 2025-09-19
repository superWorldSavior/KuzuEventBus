"""Redis Streams implementation of the MessageQueueService."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional
from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import ResponseError

from src.domain.shared.ports.query_execution import MessageQueueService


class RedisMessageQueueService(MessageQueueService):
    """Implementation using Redis Streams for transaction queueing."""

    def __init__(
        self,
        redis: Redis,
        stream_name: str = "query_transactions",
        max_length: int = 10_000,
        block_ms: int = 5_000,
    ) -> None:
        self._redis = redis
        self._stream = stream_name
        self._max_length = max_length
        self._block_ms = block_ms

    async def enqueue_transaction(
        self, transaction_id: UUID, tenant_id: UUID, priority: int = 0
    ) -> bool:
        await self._redis.xadd(
            self._stream,
            {
                "transaction_id": str(transaction_id),
                "tenant_id": str(tenant_id),
                "priority": str(priority),
            },
            maxlen=self._max_length,
            approximate=False,
        )
        return True

    async def _ensure_group(self, consumer_group: str) -> None:
        try:
            await self._redis.xgroup_create(
                name=self._stream,
                groupname=consumer_group,
                id="0",
                mkstream=True,
            )
        except ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def dequeue_transaction(
        self, consumer_group: str, consumer_name: str
    ) -> Optional[Dict[str, Any]]:
        await self._ensure_group(consumer_group)
        entries = await self._redis.xreadgroup(
            groupname=consumer_group,
            consumername=consumer_name,
            streams={self._stream: ">"},
            count=1,
            block=self._block_ms,
        )
        if not entries:
            return None
        _, messages = entries[0]
        message_id, payload = messages[0]
        return {
            "message_id": message_id,
            "consumer_group": consumer_group,
            "consumer_name": consumer_name,
            "transaction_id": UUID(payload["transaction_id"]),
            "tenant_id": UUID(payload["tenant_id"]),
            "priority": int(payload.get("priority", "0")),
            "raw": payload,
        }

    async def acknowledge_transaction(
        self, consumer_group: str, message_id: str
    ) -> bool:
        await self._redis.xack(self._stream, consumer_group, message_id)
        await self._redis.xdel(self._stream, message_id)
        return True

    async def publish_notification(
        self,
        tenant_id: UUID,
        transaction_id: UUID,
        event_type: str,
        data: Dict[str, Any],
    ) -> bool:
        channel = f"notifications:{tenant_id}"
        payload = json.dumps({"transaction_id": str(transaction_id), "event_type": event_type, "data": data}, default=str)
        await self._redis.publish(channel, payload)
        return True
