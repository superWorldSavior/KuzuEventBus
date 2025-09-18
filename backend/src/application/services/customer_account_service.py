"""
Customer Account Management Application Service.

Handles customer registration, account management, and API key operations.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from ...domain.shared.ports import (
    AuthenticationService,
    CacheService,
    CustomerAccountRepository,
    NotificationService,
)
from ...domain.shared.value_objects import EmailAddress, EntityId, TenantName
from ...domain.tenant_management.customer_account import (
    CustomerAccount,
    CustomerAccountStatus,
)


class CustomerAccountService:
    """Application service for customer account operations."""

    def __init__(
        self,
        account_repository: CustomerAccountRepository,
        auth_service: AuthenticationService,
        notification_service: NotificationService,
        cache_service: CacheService,
    ) -> None:
        self._account_repository = account_repository
        self._auth_service = auth_service
        self._notification_service = notification_service
        self._cache_service = cache_service

    def _is_account_active(self, account: CustomerAccount) -> bool:
        """Check if account is active and not suspended/deleted."""
        return account.status == CustomerAccountStatus.ACTIVE

    async def register_customer(
        self, tenant_name: str, admin_email: str, organization_name: str
    ) -> Dict[str, Any]:
        """
        Register a new customer account.

        Args:
            tenant_name: Unique tenant identifier
            admin_email: Administrator email address
            organization_name: Organization display name

        Returns:
            Dict with customer_id, api_key, and account details

        Raises:
            ValueError: If validation fails or tenant already exists
        """
        # Validate inputs
        tenant_name_vo = TenantName(tenant_name)
        admin_email_vo = EmailAddress(admin_email)

        # Check if tenant already exists
        existing = await self._account_repository.find_by_tenant_name(tenant_name_vo)
        if existing:
            raise ValueError(f"Tenant '{tenant_name}' already exists")

        # Create new customer account
        customer_id = EntityId(uuid4())
        account = CustomerAccount(
            id=customer_id,
            name=tenant_name_vo,
            email=admin_email_vo,
            status=CustomerAccountStatus.ACTIVE,
        )

        # Generate initial API key
        api_key = await self._auth_service.generate_api_key(
            tenant_id=customer_id.value,
            key_name="default",
            permissions=["database:read", "database:write", "query:execute"],
        )

        # Save account
        await self._account_repository.save(account)

        # Send welcome notification
        await self._notification_service.send_notification(
            tenant_id=customer_id.value,
            notification_type="welcome",
            title="Welcome to Kuzu Event Bus",
            message=(
                f"Your account has been created successfully. "
                f"Organization: {organization_name}"
            ),
        )

        # Cache account for quick access
        cache_key = f"account:{customer_id.value}"
        await self._cache_service.set(
            key=cache_key,
            value={
                "customer_id": str(customer_id.value),
                "tenant_name": tenant_name,
                "organization_name": organization_name,
                "status": account.status.value,
            },
            expire_seconds=3600,  # 1 hour
        )

        return {
            "customer_id": str(customer_id.value),
            "tenant_name": tenant_name,
            "organization_name": organization_name,
            "admin_email": admin_email,
            "api_key": api_key,
            "subscription_status": account.status.value,
            "created_at": account.created_at.isoformat(),
        }

    async def get_account_details(self, customer_id: UUID) -> Optional[Dict[str, Any]]:
        """Get customer account details."""
        # Try cache first
        cache_key = f"account:{customer_id}"
        cached = await self._cache_service.get(cache_key)
        if cached:
            return cached

        # Fetch from repository
        account = await self._account_repository.find_by_id(EntityId(customer_id))
        if not account:
            return None

        details = {
            "customer_id": str(account.id.value),
            "tenant_name": account.name.value,
            "admin_email": account.email.value,
            "subscription_status": account.status.value,
            "storage_quota_gb": account.subscription.storage_quota.gigabytes,
            "max_databases": account.subscription.max_databases,
            "max_concurrent_queries": account.subscription.max_concurrent_queries,
            "created_at": account.created_at.isoformat(),
            "last_activity": account.last_login.isoformat()
            if account.last_login
            else None,
        }

        # Cache for future requests
        await self._cache_service.set(key=cache_key, value=details, expire_seconds=3600)

        return details

    async def create_api_key(
        self, customer_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        """Create new API key for customer."""
        # Verify account exists
        account = await self._account_repository.find_by_id(EntityId(customer_id))
        if not account:
            raise ValueError(f"Customer {customer_id} not found")

        if not self._is_account_active(account):
            raise ValueError("Account is not active")

        # Generate API key
        api_key = await self._auth_service.generate_api_key(
            tenant_id=customer_id, key_name=key_name, permissions=permissions
        )

        # Send notification
        await self._notification_service.send_notification(
            tenant_id=customer_id,
            notification_type="api_key_created",
            title="New API Key Created",
            message=(
                f"API key '{key_name}' has been created with "
                f"{len(permissions)} permissions"
            ),
        )

        return api_key

    async def revoke_api_key(self, customer_id: UUID, api_key: str) -> bool:
        """Revoke an API key."""
        # Verify account exists and is active
        account = await self._account_repository.find_by_id(EntityId(customer_id))
        if not account or not self._is_account_active(account):
            return False

        # Revoke key
        success = await self._auth_service.revoke_api_key(api_key)

        if success:
            # Send notification
            await self._notification_service.send_notification(
                tenant_id=customer_id,
                notification_type="api_key_revoked",
                title="API Key Revoked",
                message="An API key has been revoked from your account",
            )

        return success

    async def list_api_keys(self, customer_id: UUID) -> List[Dict[str, Any]]:
        """List all API keys for customer."""
        # Verify account exists
        account = await self._account_repository.find_by_id(EntityId(customer_id))
        if not account:
            raise ValueError(f"Customer {customer_id} not found")

        return await self._auth_service.list_api_keys(customer_id)

    async def update_subscription_status(
        self, customer_id: UUID, new_status: str
    ) -> bool:
        """Update customer subscription status."""
        account = await self._account_repository.find_by_id(EntityId(customer_id))
        if not account:
            return False

        # Update account
        if new_status == "suspended":
            account.suspend_account("Administrative action")
        elif new_status == "active" and account.status.value == "suspended":
            account.reactivate_account()

        # Save changes
        await self._account_repository.save(account)

        # Invalidate cache
        cache_key = f"account:{customer_id}"
        await self._cache_service.delete(cache_key)

        # Send notification
        await self._notification_service.send_notification(
            tenant_id=customer_id,
            notification_type="subscription_updated",
            title="Subscription Status Updated",
            message=(
                f"Your subscription status has been updated to: {new_status}"
            ),
        )

        return True
