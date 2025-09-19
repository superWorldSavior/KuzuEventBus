from uuid import uuid4, UUID
import pytest

from src.infrastructure.notifications.logging_notification_service import (
    LoggingNotificationService,
)


@pytest.mark.asyncio
async def test_send_and_retrieve_notifications():
    service = LoggingNotificationService()
    tenant_id = uuid4()
    notif_id = await service.send_notification(
        tenant_id,
        notification_type="welcome",
        title="Welcome",
        message="Hello",
    )
    all_items = await service.get_notifications(tenant_id)
    assert len(all_items) == 1
    assert all_items[0]["id"] == str(notif_id)
    unread = await service.get_unread_count(tenant_id)
    assert unread == 1
    # mark read
    assert await service.mark_as_read(tenant_id, notif_id) is True
    assert await service.get_unread_count(tenant_id) == 0


@pytest.mark.asyncio
async def test_unread_only_filter():
    service = LoggingNotificationService()
    tenant_id = uuid4()
    await service.send_notification(tenant_id, "a", "T1", "M1")
    await service.send_notification(tenant_id, "b", "T2", "M2")
    items = await service.get_notifications(tenant_id, unread_only=True)
    assert len(items) == 2
    # Mark first as read
    first_id = items[0]["id"]
    await service.mark_as_read(tenant_id, UUID(first_id))
    after = await service.get_notifications(tenant_id, unread_only=True)
    assert len(after) == 1
