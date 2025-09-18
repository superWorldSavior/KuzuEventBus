"""
Domain ports package.

Centralized Protocol-based interfaces for dependency inversion.
Following hexagonal architecture principles.
"""

from .authentication import AuthenticationService, AuthorizationService, SessionService
from .database_management import (
    FileStorageService,
    KuzuDatabaseRepository,
    KuzuQueryService,
)
from .notifications import (
    EventStoreService,
    NotificationService,
    ServerSentEventService,
)
from .query_execution import (
    CacheService,
    DistributedLockService,
    MessageQueueService,
    TransactionRepository,
    TransactionStatus,
)

# Re-export all port protocols for easy importing
from .tenant_management import CustomerAccountRepository

__all__ = [
    # Tenant Management
    "CustomerAccountRepository",
    # Database Management
    "KuzuDatabaseRepository",
    "FileStorageService",
    "KuzuQueryService",
    # Query Execution
    "TransactionRepository",
    "MessageQueueService",
    "CacheService",
    "DistributedLockService",
    "TransactionStatus",
    # Authentication
    "AuthenticationService",
    "AuthorizationService",
    "SessionService",
    # Notifications
    "NotificationService",
    "ServerSentEventService",
    "EventStoreService",
]
