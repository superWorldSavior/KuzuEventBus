"""Tests for SSEEventService."""
import pytest
from uuid import UUID, uuid4

from src.infrastructure.events.sse_event_service import SSEEventService


class FakeRedis:
    """Minimal Redis mock for xadd testing."""

    def __init__(self) -> None:
        self.streams: dict[str, list[tuple[str, dict]]] = {}
        self.last_id = 0

    async def xadd(self, name: str, fields: dict, maxlen: int = None, approximate: bool = False):
        """Mock xadd: store entry and return auto-generated ID."""
        self.last_id += 1
        entry_id = f"{self.last_id}-0"
        self.streams.setdefault(name, [])
        self.streams[name].append((entry_id, fields))
        # Trim if maxlen specified
        if maxlen and len(self.streams[name]) > maxlen:
            self.streams[name] = self.streams[name][-maxlen:]
        return entry_id


@pytest.mark.asyncio
async def test_emit_event_emits_to_stream():
    """SSE event service should emit events to Redis Streams."""
    redis = FakeRedis()
    service = SSEEventService(redis)
    
    tenant_id = uuid4()
    
    await service.emit_event(
        tenant_id=tenant_id,
        event_type="database_created",
        title="Database Created",
        message="Your database 'prod-db' was created successfully",
        metadata={"database_id": "123", "database_name": "prod-db"},
    )
    
    # Verify event was added to stream
    stream_key = f"events:{tenant_id}"
    assert stream_key in redis.streams
    assert len(redis.streams[stream_key]) == 1
    
    entry_id, fields = redis.streams[stream_key][0]
    assert fields["event_type"] == "database_created"
    assert fields["title"] == "Database Created"
    assert fields["message"] == "Your database 'prod-db' was created successfully"
    assert fields["database_id"] == "123"
    assert fields["database_name"] == "prod-db"
    assert "timestamp" in fields


@pytest.mark.asyncio
async def test_multiple_events_same_tenant():
    """Multiple events for same tenant should append to same stream."""
    redis = FakeRedis()
    service = SSEEventService(redis)
    
    tenant_id = uuid4()
    
    await service.emit_event(tenant_id, "event1", "T1", "M1")
    await service.emit_event(tenant_id, "event2", "T2", "M2")
    await service.emit_event(tenant_id, "event3", "T3", "M3")
    
    stream_key = f"events:{tenant_id}"
    assert len(redis.streams[stream_key]) == 3
    assert redis.streams[stream_key][0][1]["event_type"] == "event1"
    assert redis.streams[stream_key][1][1]["event_type"] == "event2"
    assert redis.streams[stream_key][2][1]["event_type"] == "event3"


@pytest.mark.asyncio
async def test_different_tenants_separate_streams():
    """Events for different tenants should go to separate streams."""
    redis = FakeRedis()
    service = SSEEventService(redis)
    
    tenant_a = uuid4()
    tenant_b = uuid4()
    
    await service.emit_event(tenant_a, "evt", "TA", "MA")
    await service.emit_event(tenant_b, "evt", "TB", "MB")
    
    assert f"events:{tenant_a}" in redis.streams
    assert f"events:{tenant_b}" in redis.streams
    assert len(redis.streams[f"events:{tenant_a}"]) == 1
    assert len(redis.streams[f"events:{tenant_b}"]) == 1


@pytest.mark.asyncio
async def test_stream_trimming():
    """Stream should respect maxlen trimming."""
    redis = FakeRedis()
    service = SSEEventService(redis, max_stream_length=3)
    
    tenant_id = uuid4()
    
    for i in range(5):
        await service.emit_event(tenant_id, f"event{i}", f"T{i}", f"M{i}")
    
    stream_key = f"events:{tenant_id}"
    # Should only keep last 3 events
    assert len(redis.streams[stream_key]) == 3
    assert redis.streams[stream_key][0][1]["event_type"] == "event2"
    assert redis.streams[stream_key][1][1]["event_type"] == "event3"
    assert redis.streams[stream_key][2][1]["event_type"] == "event4"
