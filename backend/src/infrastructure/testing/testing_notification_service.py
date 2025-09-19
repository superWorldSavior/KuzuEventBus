"""Testing notification service (dev/test only)."""
from __future__ import annotations

from src.domain.shared.ports.notifications import NotificationService


class TestingNotificationService(NotificationService):
    def __init__(self) -> None:
        self._notifications = []

    async def send_notification(
        self,
        tenant_id: str,
        notification_type: str,
        title: str,
        message: str,
    ) -> None:
        self._notifications.append(
            {
                "tenant_id": tenant_id,
                "type": notification_type,
                "title": title,
                "message": message,
            }
        )

    async def subscribe_to_events(self, tenant_id: str, event_types: list[str]) -> None:
        return None

    async def unsubscribe_from_events(self, tenant_id: str, event_types: list[str]) -> None:
        return None

