"""
In-memory notification service.
YAGNI implementation - just prints notifications for now.
"""
from src.domain.shared.ports.notifications import NotificationService


class InMemoryNotificationService(NotificationService):
    """Simple notification service that logs to console."""

    def __init__(self):
        self._notifications = []

    async def send_notification(
        self,
        tenant_id: str,
        notification_type: str,
        title: str,
        message: str,
    ) -> None:
        """Send notification - just store for now."""
        notification = {
            "tenant_id": tenant_id,
            "type": notification_type,
            "title": title,
            "message": message,
        }
        self._notifications.append(notification)
        print(f"📧 Notification: {title} -> {message}")

    async def subscribe_to_events(self, tenant_id: str, event_types: list[str]) -> None:
        """Subscribe to events - no-op for now."""
        print(f"📡 Subscribed {tenant_id} to events: {event_types}")

    async def unsubscribe_from_events(self, tenant_id: str, event_types: list[str]) -> None:
        """Unsubscribe from events - no-op for now."""
        print(f"📡 Unsubscribed {tenant_id} from events: {event_types}")