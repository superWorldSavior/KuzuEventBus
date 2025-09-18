"""
In-memory tenant management adapter.
YAGNI implementation - stores data in dictionaries for rapid development.
"""
from typing import Dict, List, Optional, Union
from uuid import UUID

from src.domain.shared.ports.tenant_management import CustomerAccountRepository
from src.domain.shared.value_objects import EntityId, TenantName
from src.domain.tenant_management.customer_account import CustomerAccount


class InMemoryTenantRepository(CustomerAccountRepository):
    """Simple in-memory storage for customer accounts."""

    def __init__(self):
        self._accounts: Dict[str, CustomerAccount] = {}
        self._tenant_names: Dict[str, str] = {}  # tenant_name -> customer_id

    async def save(self, account: CustomerAccount) -> CustomerAccount:
        """Save account to memory."""
        customer_id = str(account.id.value)
        tenant_name = account.name.value

        self._accounts[customer_id] = account
        self._tenant_names[tenant_name] = customer_id
        return account

    async def find_by_id(self, account_id: UUID) -> Optional[CustomerAccount]:
        """Find account by customer ID."""
        return self._accounts.get(str(account_id))

    async def find_by_email(self, email: str) -> Optional[CustomerAccount]:
        """Find account by email address."""
        for account in self._accounts.values():
            if account.email.value == email:
                return account
        return None

    async def find_by_api_key(self, api_key: str) -> Optional[CustomerAccount]:
        """Find account by API key."""
        for account in self._accounts.values():
            if account.api_key.value == api_key:
                return account
        return None

    async def find_all(self, limit: int = 100, offset: int = 0) -> List[CustomerAccount]:
        """Find all customer accounts with pagination."""
        accounts = list(self._accounts.values())
        return accounts[offset : offset + limit]

    async def delete(self, account_id: UUID) -> bool:
        """Delete a customer account."""
        account_id_str = str(account_id)
        if account_id_str in self._accounts:
            account = self._accounts[account_id_str]
            tenant_name = account.name.value
            del self._accounts[account_id_str]
            if tenant_name in self._tenant_names:
                del self._tenant_names[tenant_name]
            return True
        return False

    async def count_total(self) -> int:
        """Count total number of customer accounts."""
        return len(self._accounts)

    async def find_by_tenant_name(
        self, tenant_name: Union[TenantName, str]
    ) -> Optional[CustomerAccount]:
        """Find account by tenant name."""
        name_key = tenant_name.value if isinstance(tenant_name, TenantName) else tenant_name
        customer_id = self._tenant_names.get(name_key)
        if customer_id:
            return self._accounts.get(customer_id)
        return None

    async def exists_by_tenant_name(self, tenant_name: Union[TenantName, str]) -> bool:
        """Check if tenant name exists."""
        name_key = tenant_name.value if isinstance(tenant_name, TenantName) else tenant_name
        return name_key in self._tenant_names

    # Legacy methods for backward compatibility
    async def save_customer(self, customer: CustomerAccount) -> str:
        """Legacy method - use save() instead."""
        await self.save(customer)
        return str(customer.id.value)

    async def get_customer_by_id(self, customer_id: str) -> Optional[CustomerAccount]:
        """Legacy method - use find_by_id() instead."""
        try:
            uuid_id = UUID(customer_id)
            return await self.find_by_id(uuid_id)
        except ValueError:
            return None

    async def list_all_customers(self) -> List[CustomerAccount]:
        """Get all customers - used by authentication middleware."""
        return await self.find_all(limit=1000)
