"""
In-memory tenant management adapter.
YAGNI implementation - stores data in dictionaries for rapid development.
"""
from typing import Dict, Optional
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
        tenant_name = account.name
        
        self._accounts[customer_id] = account
        self._tenant_names[tenant_name] = customer_id
        return account

    async def find_by_id(self, account_id: UUID) -> Optional[CustomerAccount]:
        """Find account by customer ID."""
        return self._accounts.get(str(account_id))

    async def find_by_tenant_name(self, tenant_name: str) -> Optional[CustomerAccount]:
        """Find account by tenant name."""
        customer_id = self._tenant_names.get(tenant_name)
        if customer_id:
            return self._accounts.get(customer_id)
        return None

    async def exists_by_tenant_name(self, tenant_name: str) -> bool:
        """Check if tenant name exists."""
        return tenant_name in self._tenant_names