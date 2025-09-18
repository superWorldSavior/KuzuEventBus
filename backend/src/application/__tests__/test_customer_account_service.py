"""
Test for Customer Account Service.

Tests customer registration and account management use cases.
"""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from src.application.services.customer_account_service import CustomerAccountService
from src.domain.shared.value_objects import (
    EmailAddress,
    EntityId,
    TenantName,
    ValidationError,
)
from src.domain.tenant_management.customer_account import (
    CustomerAccount,
    CustomerAccountStatus,
)


@pytest.fixture
def mock_repositories():
    """Create mock repository dependencies."""
    return {
        "account_repository": AsyncMock(),
        "auth_service": AsyncMock(),
        "notification_service": AsyncMock(),
        "cache_service": AsyncMock(),
    }


@pytest.fixture
def customer_service(mock_repositories):
    """Create CustomerAccountService with mocked dependencies."""
    return CustomerAccountService(
        account_repository=mock_repositories["account_repository"],
        auth_service=mock_repositories["auth_service"],
        notification_service=mock_repositories["notification_service"],
        cache_service=mock_repositories["cache_service"],
    )


class TestCustomerAccountService:
    """Test cases for CustomerAccountService."""

    @pytest.mark.asyncio
    async def test_register_customer_success(self, customer_service, mock_repositories):
        """Test successful customer registration."""
        # Arrange
        tenant_name = "test-company"
        admin_email = "admin@test-company.com"
        organization_name = "Test Company Inc"
        api_key = "kb_" + "a" * 40  # satisfy length requirement

        mock_repositories["account_repository"].find_by_tenant_name.return_value = None
        mock_repositories["auth_service"].generate_api_key.return_value = api_key

        # Act
        result = await customer_service.register_customer(
            tenant_name=tenant_name,
            admin_email=admin_email,
            organization_name=organization_name,
        )

        # Assert
        assert result["tenant_name"] == tenant_name
        assert result["admin_email"] == admin_email
        assert result["organization_name"] == organization_name
        assert result["api_key"] == api_key
        assert result["subscription_status"] == CustomerAccountStatus.ACTIVE.value
        assert "customer_id" in result
        assert "created_at" in result

        # Verify repository calls
        mock_repositories["account_repository"].find_by_tenant_name.assert_called_once()
        mock_repositories["account_repository"].save.assert_called_once()
        mock_repositories["auth_service"].generate_api_key.assert_called_once()
        mock_repositories["notification_service"].send_notification.assert_called_once()
        mock_repositories["cache_service"].set.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_customer_duplicate_tenant(
        self, customer_service, mock_repositories
    ):
        """Test registration fails when tenant already exists."""
        # Arrange
        existing_account = MagicMock()
        mock_repositories[
            "account_repository"
        ].find_by_tenant_name.return_value = existing_account

        # Act & Assert
        with pytest.raises(ValueError, match="Tenant 'existing-tenant' already exists"):
            await customer_service.register_customer(
                tenant_name="existing-tenant",
                admin_email="admin@existing.com",
                organization_name="Existing Company",
            )

    @pytest.mark.asyncio
    async def test_register_customer_invalid_email(
        self, customer_service, mock_repositories
    ):
        """Test registration fails with invalid email."""
        # Act & Assert
        with pytest.raises(ValidationError, match="Invalid email address"):
            await customer_service.register_customer(
                tenant_name="valid-tenant",
                admin_email="invalid-email",
                organization_name="Valid Company",
            )

    @pytest.mark.asyncio
    async def test_get_account_details_from_cache(
        self, customer_service, mock_repositories
    ):
        """Test getting account details from cache."""
        # Arrange
        customer_id = uuid4()
        cached_data = {
            "customer_id": str(customer_id),
            "tenant_name": "test-company",
            "organization_name": "Test Company Inc",
            "status": "active",
        }
        mock_repositories["cache_service"].get.return_value = cached_data

        # Act
        result = await customer_service.get_account_details(customer_id)

        # Assert
        assert result == cached_data
        mock_repositories["cache_service"].get.assert_called_once_with(
            f"account:{customer_id}"
        )
        mock_repositories["account_repository"].find_by_id.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_account_details_from_repository(
        self, customer_service, mock_repositories
    ):
        """Test getting account details from repository when not cached."""
        # Arrange
        customer_id = uuid4()
        mock_repositories["cache_service"].get.return_value = None

        # Create mock active account
        mock_account = MagicMock()
        mock_account.id = EntityId(customer_id)
        mock_account.name = TenantName("test-company")
        mock_account.organization_name = "Test Company Inc"
        mock_account.email = EmailAddress("admin@test.com")
        mock_account.status = CustomerAccountStatus.ACTIVE
        mock_account.subscription = MagicMock()
        mock_account.subscription.storage_quota.gigabytes = 100
        mock_account.subscription.max_databases = 5
        mock_account.subscription.max_concurrent_queries = 1000
        mock_account.created_at = datetime.utcnow()
        mock_account.last_login = None

        mock_repositories["account_repository"].find_by_id.return_value = mock_account

        # Act
        result = await customer_service.get_account_details(customer_id)

        # Assert
        assert result["customer_id"] == str(customer_id)
        assert result["tenant_name"] == "test-company"
        assert result["admin_email"] == "admin@test.com"
        assert result["subscription_status"] == "active"
        assert result["max_databases"] == 5
        assert result["max_concurrent_queries"] == 1000

        # Verify caching
        mock_repositories["cache_service"].set.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_account_details_not_found(
        self, customer_service, mock_repositories
    ):
        """Test getting account details for non-existent account."""
        # Arrange
        customer_id = uuid4()
        mock_repositories["cache_service"].get.return_value = None
        mock_repositories["account_repository"].find_by_id.return_value = None

        # Act
        result = await customer_service.get_account_details(customer_id)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_create_api_key_success(self, customer_service, mock_repositories):
        """Test successful API key creation."""
        # Arrange
        customer_id = uuid4()
        key_name = "production-key"
        permissions = ["database:read", "query:execute"]
        new_api_key = "new-api-key-456"

        # Create mock active account
        mock_account = MagicMock()
        mock_account.status = CustomerAccountStatus.ACTIVE
        mock_repositories["account_repository"].find_by_id.return_value = mock_account
        mock_repositories["auth_service"].generate_api_key.return_value = new_api_key

        # Act
        result = await customer_service.create_api_key(
            customer_id=customer_id, key_name=key_name, permissions=permissions
        )

        # Assert
        assert result == new_api_key
        mock_repositories["auth_service"].generate_api_key.assert_called_once_with(
            tenant_id=customer_id, key_name=key_name, permissions=permissions
        )
        mock_repositories["notification_service"].send_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_api_key_inactive_account(
        self, customer_service, mock_repositories
    ):
        """Test API key creation fails for inactive account."""
        # Arrange
        customer_id = uuid4()
        mock_account = MagicMock()
        mock_account.status = CustomerAccountStatus.SUSPENDED
        mock_repositories["account_repository"].find_by_id.return_value = mock_account

        # Act & Assert
        with pytest.raises(ValueError, match="Account is not active"):
            await customer_service.create_api_key(
                customer_id=customer_id,
                key_name="test-key",
                permissions=["database:read"],
            )

    @pytest.mark.asyncio
    async def test_create_api_key_account_not_found(
        self, customer_service, mock_repositories
    ):
        """Test API key creation fails when account not found."""
        # Arrange
        customer_id = uuid4()
        mock_repositories["account_repository"].find_by_id.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match=f"Customer {customer_id} not found"):
            await customer_service.create_api_key(
                customer_id=customer_id,
                key_name="test-key",
                permissions=["database:read"],
            )

    @pytest.mark.asyncio
    async def test_revoke_api_key_success(self, customer_service, mock_repositories):
        """Test successful API key revocation."""
        # Arrange
        customer_id = uuid4()
        api_key = "api-key-to-revoke"

        mock_account = MagicMock()
        mock_account.status = CustomerAccountStatus.ACTIVE
        mock_repositories["account_repository"].find_by_id.return_value = mock_account
        mock_repositories["auth_service"].revoke_api_key.return_value = True

        # Act
        result = await customer_service.revoke_api_key(customer_id, api_key)

        # Assert
        assert result is True
        mock_repositories["auth_service"].revoke_api_key.assert_called_once_with(
            api_key
        )
        mock_repositories["notification_service"].send_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_api_keys_success(self, customer_service, mock_repositories):
        """Test successful API key listing."""
        # Arrange
        customer_id = uuid4()
        api_keys = [
            {"key_id": "key1", "name": "default", "created_at": "2023-01-01T00:00:00Z"},
            {
                "key_id": "key2",
                "name": "production",
                "created_at": "2023-01-02T00:00:00Z",
            },
        ]

        mock_account = MagicMock()
        mock_repositories["account_repository"].find_by_id.return_value = mock_account
        mock_repositories["auth_service"].list_api_keys.return_value = api_keys

        # Act
        result = await customer_service.list_api_keys(customer_id)

        # Assert
        assert result == api_keys
        mock_repositories["auth_service"].list_api_keys.assert_called_once_with(
            customer_id
        )

    @pytest.mark.asyncio
    async def test_update_subscription_status_suspend(
        self, customer_service, mock_repositories
    ):
        """Test suspending account subscription."""
        # Arrange
        customer_id = uuid4()
        mock_account = MagicMock()
        mock_repositories["account_repository"].find_by_id.return_value = mock_account

        # Act
        result = await customer_service.update_subscription_status(
            customer_id, "suspended"
        )

        # Assert
        assert result is True
        mock_account.suspend_account.assert_called_once_with("Administrative action")
        mock_repositories["account_repository"].save.assert_called_once_with(
            mock_account
        )
        mock_repositories["cache_service"].delete.assert_called_once_with(
            f"account:{customer_id}"
        )
        mock_repositories["notification_service"].send_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_subscription_status_reactivate(
        self, customer_service, mock_repositories
    ):
        """Test reactivating suspended account."""
        # Arrange
        customer_id = uuid4()
        mock_account = MagicMock()
        mock_account.status.value = "suspended"
        mock_repositories["account_repository"].find_by_id.return_value = mock_account

        # Act
        result = await customer_service.update_subscription_status(
            customer_id, "active"
        )

        # Assert
        assert result is True
        mock_account.reactivate_account.assert_called_once()
        mock_repositories["account_repository"].save.assert_called_once_with(
            mock_account
        )
        mock_repositories["cache_service"].delete.assert_called_once_with(
            f"account:{customer_id}"
        )
        mock_repositories["notification_service"].send_notification.assert_called_once()
