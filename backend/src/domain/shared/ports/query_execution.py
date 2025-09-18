"""
Query Execution domain ports.

Repository and service protocols for transaction management and query execution.
"""
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
from uuid import UUID


class TransactionStatus(Enum):
    """Transaction execution status."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@runtime_checkable
class TransactionRepository(Protocol):
    """Protocol for transaction persistence operations."""

    async def save_transaction(
        self,
        transaction_id: UUID,
        tenant_id: UUID,
        database_id: UUID,
        query: str,
        parameters: Dict[str, Any],
        status: TransactionStatus,
        timeout_seconds: int,
    ) -> UUID:
        """Save transaction and return transaction ID."""
        ...

    async def find_by_id(self, transaction_id: UUID) -> Optional[Dict[str, Any]]:
        """Find transaction by ID."""
        ...

    async def find_by_tenant(
        self, tenant_id: UUID, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Find transactions for a tenant with pagination."""
        ...

    async def find_running_transactions(self) -> List[Dict[str, Any]]:
        """Find all currently running transactions."""
        ...

    async def update_status(
        self,
        transaction_id: UUID,
        status: TransactionStatus,
        result_count: int = 0,
        error_message: Optional[str] = None,
    ) -> bool:
        """Update transaction status and results."""
        ...


@runtime_checkable
class MessageQueueService(Protocol):
    """Protocol for message queue operations (Redis Streams)."""

    async def enqueue_transaction(
        self, transaction_id: UUID, tenant_id: UUID, priority: int = 0
    ) -> bool:
        """Add transaction to processing queue."""
        ...

    async def dequeue_transaction(
        self, consumer_group: str, consumer_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get next transaction from queue."""
        ...

    async def acknowledge_transaction(
        self, consumer_group: str, message_id: str
    ) -> bool:
        """Acknowledge transaction processing completion."""
        ...

    async def publish_notification(
        self,
        tenant_id: UUID,
        transaction_id: UUID,
        event_type: str,
        data: Dict[str, Any],
    ) -> bool:
        """Publish notification for SSE streaming."""
        ...


@runtime_checkable
class CacheService(Protocol):
    """Protocol for caching operations (Redis)."""

    async def set(
        self, key: str, value: Any, expire_seconds: Optional[int] = None
    ) -> bool:
        """Set cache value with optional expiration."""
        ...

    async def get(self, key: str) -> Optional[Any]:
        """Get cached value."""
        ...

    async def delete(self, key: str) -> bool:
        """Delete cache entry."""
        ...

    async def exists(self, key: str) -> bool:
        """Check if cache key exists."""
        ...


@runtime_checkable
class DistributedLockService(Protocol):
    """Protocol for distributed locking (Redlock)."""

    async def acquire_lock(
        self, resource: str, timeout_seconds: int = 10
    ) -> Optional[str]:
        """Acquire distributed lock. Returns lock token if successful."""
        ...

    async def release_lock(self, resource: str, token: str) -> bool:
        """Release distributed lock."""
        ...

    async def extend_lock(self, resource: str, token: str, extend_seconds: int) -> bool:
        """Extend lock expiration time."""
        ...


@runtime_checkable
class QueryExecutionService(Protocol):
    """Protocol for direct (synchronous) Cypher query execution.

    This is a lightweight port distinct from the transaction/queue model above.
    It allows the application layer to execute a query immediately (Phase 3 MVP)
    while the more advanced transactional & queue-based execution model can be
    layered in later without breaking the contract.
    """

    async def execute_query(
        self,
        tenant_id: UUID,
        database_id: UUID,
        cypher: str,
        parameters: Optional[Dict[str, Any]] = None,
        timeout_seconds: int = 30,
    ) -> Dict[str, Any]:
        """Execute a Cypher query and return structured results.

        Returns dict with keys:
          - results: List[Dict[str, Any]] row-wise data
          - execution_time_ms: float
          - rows_returned: int
          - meta: Optional diagnostic info
        """
        ...

    async def explain_query(
        self,
        tenant_id: UUID,
        database_id: UUID,
        cypher: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Return query execution plan / cost estimation (if supported)."""
        ...

