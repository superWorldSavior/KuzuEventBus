"""SSE Event Service - Broadcasts events via Redis Streams to frontend."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from redis.asyncio import Redis

from src.domain.shared.ports.notifications import EventService
from src.infrastructure.logging.config import infra_logger


class SSEEventService(EventService):
    """Broadcasts events to frontend via Redis Streams (SSE).
    
    Events are published to streams keyed by tenant: events:{tenant_id}
    Frontend consumes via /api/v1/events/stream endpoint.
    """

    def __init__(self, redis: Redis, max_stream_length: int = 10_000) -> None:
        self._redis = redis
        self._max_length = max_stream_length

    async def emit_event(
        self,
        tenant_id: UUID,
        event_type: str,
        title: str,
        message: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> UUID:
        """Emit event to Redis Stream for SSE consumption.
        
        Returns a dummy UUID for interface compatibility (stream entry ID is auto-generated).
        """
        try:
            fields = {
                "event_type": event_type,
                "title": title,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            
            # Add metadata fields
            if metadata:
                for key, value in metadata.items():
                    fields[key] = str(value) if not isinstance(value, str) else value
            
            # Publish to tenant-specific event stream
            entry_id = await self._redis.xadd(
                name=f"events:{tenant_id}",
                fields=fields,
                maxlen=self._max_length,
                approximate=True,
            )
            
            infra_logger.info(
                "SSE event emitted",
                tenant_id=str(tenant_id),
                event_type=event_type,
                stream_entry=entry_id.decode() if isinstance(entry_id, bytes) else entry_id,
            )
            
            # Return dummy UUID (not used but satisfies interface)
            from uuid import uuid4
            return uuid4()
            
        except Exception as exc:
            infra_logger.error(
                "Failed to emit SSE event",
                tenant_id=str(tenant_id),
                event_type=event_type,
                error=str(exc),
            )
            raise
