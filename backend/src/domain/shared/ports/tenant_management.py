"""
Tenant Management domain ports.

Repository protocols for customer account operations.
"""
from typing import List, Optional, Protocol, runtime_checkable
from uuid import UUID

from ...tenant_management.customer_account import CustomerAccount
from ..value_objects import TenantName


@runtime_checkable
class CustomerAccountRepository(Protocol):
    """Protocol for customer account persistence operations."""

    async def save(self, account: CustomerAccount) -> CustomerAccount:
        """Save or update a customer account."""
        ...

    async def find_by_id(self, account_id: UUID) -> Optional[CustomerAccount]:
        """Find customer account by ID."""
        ...

    async def find_by_email(self, email: str) -> Optional[CustomerAccount]:
        """Find customer account by email address."""
        ...

    async def find_by_api_key(self, api_key: str) -> Optional[CustomerAccount]:
        """Find customer account by API key."""
        ...

    async def find_all(
        self, limit: int = 100, offset: int = 0
    ) -> List[CustomerAccount]:
        """Find all customer accounts with pagination."""
        ...

    async def delete(self, account_id: UUID) -> bool:
        """Delete a customer account."""
        ...

    async def count_total(self) -> int:
        """Count total number of customer accounts."""
        ...

    async def find_by_tenant_name(
        self, tenant_name: TenantName
    ) -> Optional[CustomerAccount]:
        """Find customer account by tenant name."""
        ...

    async def exists_by_tenant_name(self, tenant_name: TenantName) -> bool:
        """Check whether a tenant name already exists."""
        ...

    async def list_all_customers(self) -> List[CustomerAccount]:
        """Return all customer accounts (debug/diagnostics)."""
        ...
