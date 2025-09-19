"""Logging-based notification delivery service (in-memory).

Stores notifications per tenant and logs creation events. MVP adapter
implementing the NotificationService protocol.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from src.domain.shared.ports.notifications import NotificationService
from src.infrastructure.logging.config import get_logger


class LoggingNotificationService(NotificationService):
    def __init__(self) -> None:
        self._store: Dict[UUID, List[Dict[str, Any]]] = {}
        self._log = get_logger("notifications")

    async def send_notification(
        self,
        tenant_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UUID:
        notif_id = uuid4()
        record = {
            "id": notif_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
            "read": False,
        }
        self._store.setdefault(tenant_id, []).append(record)
        self._log.info(
            "Notification created",
            tenant_id=str(tenant_id),
            notification_type=notification_type,
            title=title,
        )
        return notif_id

    async def get_notifications(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
    ) -> List[Dict[str, Any]]:
        items = self._store.get(tenant_id, [])
        if unread_only:
            items = [n for n in items if not n["read"]]
        sliced = items[offset : offset + limit]
        return [
            {
                **n,
                "id": str(n["id"]),
                "created_at": n["created_at"].isoformat(),
            }
            for n in sliced
        ]

    async def mark_as_read(self, tenant_id: UUID, notification_id: UUID) -> bool:
        for n in self._store.get(tenant_id, []):
            if n["id"] == notification_id and not n["read"]:
                n["read"] = True
                return True
        return False

    async def get_unread_count(self, tenant_id: UUID) -> int:
        return sum(1 for n in self._store.get(tenant_id, []) if not n["read"])