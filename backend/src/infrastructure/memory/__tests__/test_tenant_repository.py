"""
Tests for in-memory implementations.
YAGNI approach - basic functionality tests only.
"""
import pytest

from src.domain.shared.value_objects import EmailAddress, EntityId, StorageSize, StorageUnit, TenantName
from src.domain.tenant_management.customer_account import (
    CustomerAccount,
    CustomerAccountStatus,
    SubscriptionDetails,
    SubscriptionPlan,
)
from src.infrastructure.memory.tenant_repository import InMemoryTenantRepository


class TestInMemoryTenantRepository:
    """Test in-memory tenant repository."""

    @pytest.fixture
    def repository(self):
        return InMemoryTenantRepository()

    @pytest.fixture
    def sample_account(self):
        # Create a minimal account directly - YAGNI approach
        return CustomerAccount(
            id=EntityId(),
            name=TenantName("test-tenant"),
            email=EmailAddress("admin@test.com"),
        )

    @pytest.mark.asyncio
    async def test_save_and_find_by_customer_id(self, repository, sample_account):
        """Should save and retrieve account by customer ID."""
        await repository.save(sample_account)
        
        found = await repository.find_by_id(sample_account.id.value)
        assert found is not None
        assert found.name.value == "test-tenant"

    @pytest.mark.asyncio
    async def test_find_by_tenant_name(self, repository, sample_account):
        """Should find account by tenant name."""
        await repository.save(sample_account)
        
        found = await repository.find_by_tenant_name("test-tenant")
        assert found is not None
        assert str(found.email) == "admin@test.com"

    @pytest.mark.asyncio
    async def test_exists_by_tenant_name(self, repository, sample_account):
        """Should check if tenant name exists."""
        # Should not exist initially
        exists = await repository.exists_by_tenant_name("test-tenant")
        assert not exists
        
        # Should exist after saving
        await repository.save(sample_account)
        exists = await repository.exists_by_tenant_name("test-tenant")
        assert exists