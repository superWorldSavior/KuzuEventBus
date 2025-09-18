"""
Query Execution Application Service.

Handles Cypher query execution with Redis streams for async processing.
"""
from datetime import datetime, timedelta
from typing import Any, AsyncGenerator, Dict, List, Optional
from uuid import UUID, uuid4

from ...domain.shared.ports import (
    AuthorizationService,
    CacheService,
    CustomerAccountRepository,
    DistributedLockService,
    KuzuDatabaseRepository,
    KuzuQueryService,
    MessageQueueService,
    NotificationService,
    TransactionRepository,
    TransactionStatus,
)
from ...domain.shared.value_objects import EntityId


class QueryExecutionService:
    """Application service for query execution and transaction management."""

    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        database_repository: KuzuDatabaseRepository,
        query_service: KuzuQueryService,
        transaction_repository: TransactionRepository,
        message_queue: MessageQueueService,
        auth_service: AuthorizationService,
        notification_service: NotificationService,
        lock_service: DistributedLockService,
        cache_service: CacheService,
    ) -> None:
        self._account_repository = account_repository
        self._database_repository = database_repository
        self._query_service = query_service
        self._transaction_repository = transaction_repository
        self._message_queue = message_queue
        self._auth_service = auth_service
        self._notification_service = notification_service
        self._lock_service = lock_service
        self._cache_service = cache_service

    async def submit_query(
        self,
        tenant_id: UUID,
        database_id: UUID,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
        timeout_seconds: int = 300,
    ) -> Dict[str, Any]:
        """
        Submit a Cypher query for execution.

        Args:
            tenant_id: Customer tenant ID
            database_id: Target database ID
            query: Cypher query string
            parameters: Query parameters
            timeout_seconds: Query timeout

        Returns:
            Dict with transaction_id and status

        Raises:
            ValueError: If validation fails
            PermissionError: If tenant lacks permissions
        """
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="query", action="execute"
        )
        if not allowed:
            raise PermissionError("Not authorized to execute queries")

        # Check rate limits
        rate_limit = await self._auth_service.check_rate_limit(
            tenant_id=tenant_id, endpoint="query_execution"
        )
        if not rate_limit["allowed"]:
            raise ValueError(
                f"Rate limit exceeded. Try again at {rate_limit['reset_time']}"
            )

        # Check query quota
        quota_check = await self._auth_service.check_quota(
            tenant_id=tenant_id, resource_type="queries_per_hour", requested_amount=1
        )
        if not quota_check["allowed"]:
            raise ValueError(
                f"Query quota exceeded. Used: {quota_check['used']}/{quota_check['limit']}"
            )

        # Verify database ownership
        db_info = await self._database_repository.get_database_info(database_id)
        if not db_info or db_info.get("tenant_id") != str(tenant_id):
            raise PermissionError("Database does not belong to tenant")

        # Validate query
        validation_result = await self._query_service.validate_query(query)
        if not validation_result["valid"]:
            raise ValueError(f"Invalid query: {validation_result['error']}")

        # Create transaction
        transaction_id = uuid4()
        await self._transaction_repository.save_transaction(
            transaction_id=transaction_id,
            tenant_id=tenant_id,
            database_id=database_id,
            query=query,
            parameters=parameters or {},
            status=TransactionStatus.PENDING,
            timeout_seconds=timeout_seconds,
        )

        # Submit to message queue
        await self._message_queue.enqueue_transaction(
            transaction_id=transaction_id,
            tenant_id=tenant_id,
            priority=0,  # Normal priority
        )

        # Send notification
        await self._notification_service.send_notification(
            tenant_id=tenant_id,
            notification_type="query_submitted",
            title="Query Submitted",
            message=f"Query has been submitted for execution",
            metadata={
                "transaction_id": str(transaction_id),
                "database_id": str(database_id),
            },
        )

        return {
            "transaction_id": str(transaction_id),
            "status": TransactionStatus.PENDING.value,
            "submitted_at": datetime.utcnow().isoformat(),
            "estimated_completion": (
                datetime.utcnow() + timedelta(seconds=30)
            ).isoformat(),
        }

    async def get_query_status(
        self, tenant_id: UUID, transaction_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get status of a query transaction."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="query", action="read"
        )
        if not allowed:
            raise PermissionError("Not authorized to read query status")

        # Try cache first
        cache_key = f"tx_status:{transaction_id}"
        cached = await self._cache_service.get(cache_key)
        if cached and cached.get("tenant_id") == str(tenant_id):
            return cached

        # Fetch from repository
        transaction = await self._transaction_repository.find_by_id(transaction_id)
        if not transaction:
            return None

        # Verify ownership
        if transaction.get("tenant_id") != str(tenant_id):
            raise PermissionError("Transaction does not belong to tenant")

        # Cache result
        await self._cache_service.set(
            key=cache_key, value=transaction, expire_seconds=60  # 1 minute
        )

        return transaction

    async def get_query_results(
        self, tenant_id: UUID, transaction_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get results of a completed query."""
        # Check status first
        transaction = await self.get_query_status(tenant_id, transaction_id)
        if not transaction:
            return None

        if transaction["status"] != TransactionStatus.COMPLETED.value:
            raise ValueError(f"Query not completed. Status: {transaction['status']}")

        # Try cache first
        cache_key = f"tx_results:{transaction_id}"
        cached = await self._cache_service.get(cache_key)
        if cached:
            return cached

        # Fetch results from query service
        results = await self._query_service.get_query_results(transaction_id)

        # Cache results
        await self._cache_service.set(
            key=cache_key, value=results, expire_seconds=3600  # 1 hour
        )

        return results

    async def cancel_query(self, tenant_id: UUID, transaction_id: UUID) -> bool:
        """Cancel a running query."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="query", action="cancel"
        )
        if not allowed:
            raise PermissionError("Not authorized to cancel queries")

        # Get current status
        transaction = await self.get_query_status(tenant_id, transaction_id)
        if not transaction:
            return False

        # Can only cancel pending or running queries
        status = TransactionStatus(transaction["status"])
        if status not in [TransactionStatus.PENDING, TransactionStatus.RUNNING]:
            return False

        # Try to acquire lock for transaction
        lock_resource = f"transaction:{transaction_id}"
        lock_token = await self._lock_service.acquire_lock(
            lock_resource, timeout_seconds=5
        )
        if not lock_token:
            raise RuntimeError("Could not acquire lock for transaction")

        try:
            # Cancel the query
            if status == TransactionStatus.RUNNING:
                await self._query_service.cancel_query(transaction_id)

            # Update status
            await self._transaction_repository.update_status(
                transaction_id=transaction_id,
                status=TransactionStatus.FAILED,
                error_message="Cancelled by user",
            )

            # Clear caches
            await self._cache_service.delete(f"tx_status:{transaction_id}")
            await self._cache_service.delete(f"tx_results:{transaction_id}")

            # Send notification
            await self._notification_service.send_notification(
                tenant_id=tenant_id,
                notification_type="query_cancelled",
                title="Query Cancelled",
                message="Query execution has been cancelled",
                metadata={"transaction_id": str(transaction_id)},
            )

            return True

        finally:
            await self._lock_service.release_lock(lock_resource, lock_token)

    async def list_transactions(
        self, tenant_id: UUID, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List query transactions for tenant."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="query", action="list"
        )
        if not allowed:
            raise PermissionError("Not authorized to list transactions")

        transactions = await self._transaction_repository.find_by_tenant(
            tenant_id=tenant_id, limit=limit, offset=offset
        )

        return transactions

    async def get_query_statistics(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get query execution statistics for tenant."""
        # Check authorization
        allowed = await self._auth_service.check_permission(
            tenant_id=tenant_id, resource="query", action="read"
        )
        if not allowed:
            raise PermissionError("Not authorized to read statistics")

        # Try cache first
        cache_key = f"stats:{tenant_id}"
        cached = await self._cache_service.get(cache_key)
        if cached:
            return cached

        # Calculate statistics
        transactions = await self._transaction_repository.find_by_tenant(
            tenant_id=tenant_id, limit=1000  # Last 1000 transactions
        )

        total_queries = len(transactions)
        completed = sum(
            1
            for tx in transactions
            if tx["status"] == TransactionStatus.COMPLETED.value
        )
        failed = sum(
            1 for tx in transactions if tx["status"] == TransactionStatus.FAILED.value
        )
        pending = sum(
            1 for tx in transactions if tx["status"] == TransactionStatus.PENDING.value
        )
        running = sum(
            1 for tx in transactions if tx["status"] == TransactionStatus.RUNNING.value
        )

        # Calculate average execution time for completed queries
        completed_txs = [
            tx
            for tx in transactions
            if tx["status"] == TransactionStatus.COMPLETED.value
        ]
        avg_execution_time = 0
        if completed_txs:
            execution_times = []
            for tx in completed_txs:
                if tx.get("completed_at") and tx.get("started_at"):
                    start = datetime.fromisoformat(tx["started_at"])
                    end = datetime.fromisoformat(tx["completed_at"])
                    execution_times.append((end - start).total_seconds())

            if execution_times:
                avg_execution_time = sum(execution_times) / len(execution_times)

        stats = {
            "total_queries": total_queries,
            "completed": completed,
            "failed": failed,
            "pending": pending,
            "running": running,
            "success_rate": (completed / total_queries * 100)
            if total_queries > 0
            else 0,
            "average_execution_time_seconds": round(avg_execution_time, 2),
            "calculated_at": datetime.utcnow().isoformat(),
        }

        # Cache for 5 minutes
        await self._cache_service.set(key=cache_key, value=stats, expire_seconds=300)

        return stats
