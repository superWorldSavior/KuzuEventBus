"""
Notification and Event Streaming domain ports.

Service protocols for Server-Sent Events and real-time notifications.
"""
from datetime import datetime
from typing import (
    Any,
    AsyncGenerator,
    Dict,
    List,
    Optional,
    Protocol,
    runtime_checkable,
)
from uuid import UUID


@runtime_checkable
class NotificationService(Protocol):
    """Protocol for notification delivery."""

    async def send_notification(
        self,
        tenant_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UUID:
        """Send notification and return notification ID."""
        ...

    async def get_notifications(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
    ) -> List[Dict[str, Any]]:
        """Get notifications for tenant."""
        ...

    async def mark_as_read(self, tenant_id: UUID, notification_id: UUID) -> bool:
        """Mark notification as read."""
        ...

    async def get_unread_count(self, tenant_id: UUID) -> int:
        """Get count of unread notifications."""
        ...


@runtime_checkable
class ServerSentEventService(Protocol):
    """Protocol for Server-Sent Events streaming."""

    async def create_event_stream(
        self, tenant_id: UUID, connection_id: str, event_types: List[str]
    ) -> AsyncGenerator[str, None]:
        """
        Create SSE stream for tenant.

        Yields:
            Formatted SSE messages as strings
        """
        ...

    async def publish_event(
        self,
        tenant_id: UUID,
        event_type: str,
        data: Dict[str, Any],
        event_id: Optional[str] = None,
    ) -> bool:
        """Publish event to tenant's SSE streams."""
        ...

    async def close_connection(self, tenant_id: UUID, connection_id: str) -> bool:
        """Close specific SSE connection."""
        ...

    async def get_active_connections(self, tenant_id: UUID) -> List[str]:
        """Get list of active connection IDs for tenant."""
        ...


@runtime_checkable
class EventStoreService(Protocol):
    """Protocol for event persistence and replay."""

    async def store_event(
        self,
        tenant_id: UUID,
        event_type: str,
        event_data: Dict[str, Any],
        correlation_id: Optional[UUID] = None,
    ) -> UUID:
        """Store event and return event ID."""
        ...

    async def get_events(
        self,
        tenant_id: UUID,
        event_types: Optional[List[str]] = None,
        since: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get events for tenant with filtering."""
        ...

    async def replay_events(
        self, tenant_id: UUID, since: datetime, event_types: Optional[List[str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Replay events as async generator."""
        ...

    async def cleanup_old_events(self, older_than: datetime) -> int:
        """Clean up old events. Returns count of deleted events."""
        ...
