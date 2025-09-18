"""
TDD Tests for CustomerAccount entity.

These tests define the expected behavior and business rules for customer accounts.
Write tests first, then implement the behavior.
"""
from datetime import datetime, timedelta

import pytest

from ...shared.value_objects import (
    BusinessRuleViolation,
    EmailAddress,
    EntityId,
    StorageSize,
    StorageUnit,
    TenantName,
    ValidationError,
)
from ..customer_account import (
    ApiKey,
    CustomerAccount,
    CustomerAccountActivated,
    CustomerAccountCreated,
    CustomerAccountStatus,
    CustomerAccountSuspended,
    StorageQuotaExceeded,
    SubscriptionDetails,
    SubscriptionPlan,
)


class TestApiKey:
    """Test cases for ApiKey value object."""

    def test_generates_valid_api_key(self):
        """Should generate valid API key with correct prefix."""
        api_key = ApiKey.generate()
        assert api_key.value.startswith("kb_")
        assert len(api_key.value) > 35  # kb_ + 32+ chars
        assert api_key.is_active
        assert api_key.last_used is None

    def test_fails_with_invalid_prefix(self):
        """Should raise ValidationError for API key without kb_ prefix."""
        with pytest.raises(ValidationError, match="must start with 'kb_' prefix"):
            ApiKey("invalid_key")

    def test_fails_with_short_key(self):
        """Should raise ValidationError for short API key."""
        with pytest.raises(ValidationError, match="API key is too short"):
            ApiKey("kb_short")

    def test_marks_key_as_used(self):
        """Should update last_used timestamp when marking as used."""
        api_key = ApiKey.generate()
        api_key.mark_as_used()
        assert api_key.last_used is not None
        assert isinstance(api_key.last_used, datetime)

    def test_cannot_use_inactive_key(self):
        """Should raise BusinessRuleViolation when trying to use inactive key."""
        api_key = ApiKey.generate()
        api_key.deactivate()

        with pytest.raises(BusinessRuleViolation, match="Cannot use inactive API key"):
            api_key.mark_as_used()


class TestSubscriptionDetails:
    """Test cases for SubscriptionDetails value object."""

    def test_creates_valid_subscription(self):
        """Should create valid subscription details."""
        subscription = SubscriptionDetails(
            plan=SubscriptionPlan.BASIC,
            storage_quota=StorageSize(1000, StorageUnit.MB),
            max_databases=10,
            max_concurrent_queries=20,
        )

        assert subscription.plan == SubscriptionPlan.BASIC
        assert subscription.storage_quota.to_megabytes() == 1000
        assert subscription.max_databases == 10
        assert subscription.max_concurrent_queries == 20

    def test_fails_with_invalid_limits(self):
        """Should raise ValidationError for invalid limits."""
        with pytest.raises(ValidationError, match="Maximum databases must be positive"):
            SubscriptionDetails(
                plan=SubscriptionPlan.BASIC,
                storage_quota=StorageSize(1000, StorageUnit.MB),
                max_databases=0,
                max_concurrent_queries=20,
            )

    def test_detects_expired_subscription(self):
        """Should detect expired subscription."""
        past_date = datetime.utcnow() - timedelta(days=1)
        subscription = SubscriptionDetails(
            plan=SubscriptionPlan.BASIC,
            storage_quota=StorageSize(1000, StorageUnit.MB),
            max_databases=10,
            max_concurrent_queries=20,
            expires_at=past_date,
        )

        assert subscription.is_expired()

    def test_calculates_days_until_expiration(self):
        """Should calculate days until expiration correctly."""
        future_date = datetime.utcnow() + timedelta(days=30)
        subscription = SubscriptionDetails(
            plan=SubscriptionPlan.BASIC,
            storage_quota=StorageSize(1000, StorageUnit.MB),
            max_databases=10,
            max_concurrent_queries=20,
            expires_at=future_date,
        )

        days_left = subscription.days_until_expiration()
        assert days_left == 30


class TestCustomerAccount:
    """Test cases for CustomerAccount aggregate."""

    def test_creates_new_customer_account(self):
        """Should create new customer account with defaults."""
        account = CustomerAccount(
            name=TenantName("Test Company"), email=EmailAddress("test@company.com")
        )

        assert account.name.value == "Test Company"
        assert account.email.value == "test@company.com"
        assert account.status == CustomerAccountStatus.TRIAL
        assert account.database_count == 0
        assert account.current_storage_usage.to_megabytes() == 0
        assert account.api_key.is_active

    def test_emits_account_created_event(self):
        """Should emit CustomerAccountCreated event for new accounts."""
        account = CustomerAccount(
            name=TenantName("Test Company"), email=EmailAddress("test@company.com")
        )

        events = account.get_uncommitted_events()
        assert len(events) == 1
        assert isinstance(events[0], CustomerAccountCreated)
        assert events[0].aggregate_id == account.id

    def test_suspends_account_correctly(self):
        """Should suspend account and deactivate API key."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Clear creation event
        account.mark_events_as_committed()

        account.suspend_account("Payment failure")

        assert account.status == CustomerAccountStatus.SUSPENDED
        assert not account.api_key.is_active

        events = account.get_uncommitted_events()
        assert len(events) == 1
        assert isinstance(events[0], CustomerAccountSuspended)

    def test_cannot_suspend_deleted_account(self):
        """Should raise BusinessRuleViolation when suspending deleted account."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.DELETED,
        )

        with pytest.raises(
            BusinessRuleViolation, match="Cannot suspend deleted account"
        ):
            account.suspend_account("Test reason")

    def test_activates_account_correctly(self):
        """Should activate suspended account."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.SUSPENDED,
        )

        # Deactivate API key to simulate suspension
        account.api_key.deactivate()
        account.mark_events_as_committed()

        account.activate_account()

        assert account.status == CustomerAccountStatus.ACTIVE
        assert account.api_key.is_active  # New API key generated

        events = account.get_uncommitted_events()
        assert len(events) == 1
        assert isinstance(events[0], CustomerAccountActivated)

    def test_cannot_activate_with_expired_subscription(self):
        """Should raise BusinessRuleViolation when activating with expired subscription."""
        past_date = datetime.utcnow() - timedelta(days=1)
        subscription = SubscriptionDetails(
            plan=SubscriptionPlan.BASIC,
            storage_quota=StorageSize(1000, StorageUnit.MB),
            max_databases=10,
            max_concurrent_queries=20,
            expires_at=past_date,
        )

        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.SUSPENDED,
            subscription=subscription,
        )

        with pytest.raises(
            BusinessRuleViolation,
            match="Cannot activate account with expired subscription",
        ):
            account.activate_account()

    def test_checks_database_creation_permission(self):
        """Should check if customer can create databases."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Should allow creation initially
        assert account.can_create_database()

        # Fill up database quota
        account.database_count = account.subscription.max_databases
        assert not account.can_create_database()

    def test_checks_file_upload_permission(self):
        """Should check if customer can upload files."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Should allow small uploads
        small_file = StorageSize(10, StorageUnit.MB)
        assert account.can_upload_file(small_file)

        # Should reject files that exceed quota
        large_file = StorageSize(200, StorageUnit.MB)  # Exceeds 100MB trial quota
        assert not account.can_upload_file(large_file)

    def test_allocates_storage_correctly(self):
        """Should allocate storage and track usage."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )
        account.mark_events_as_committed()

        file_size = StorageSize(50, StorageUnit.MB)
        account.allocate_storage(file_size)

        assert account.current_storage_usage.to_megabytes() == 50

    def test_emits_quota_exceeded_event_when_approaching_limit(self):
        """Should emit StorageQuotaExceeded event when approaching quota."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )
        account.mark_events_as_committed()

        # Allocate 95MB of 100MB quota (95%)
        large_file = StorageSize(95, StorageUnit.MB)
        account.allocate_storage(large_file)

        events = account.get_uncommitted_events()
        assert len(events) == 1
        assert isinstance(events[0], StorageQuotaExceeded)

    def test_deallocates_storage_correctly(self):
        """Should deallocate storage when files are deleted."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Allocate then deallocate
        file_size = StorageSize(50, StorageUnit.MB)
        account.allocate_storage(file_size)
        account.deallocate_storage(file_size)

        assert account.current_storage_usage.to_megabytes() == 0

    def test_increments_database_count(self):
        """Should increment database count when database is created."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        initial_count = account.database_count
        account.increment_database_count()

        assert account.database_count == initial_count + 1

    def test_cannot_increment_database_count_beyond_limit(self):
        """Should raise BusinessRuleViolation when exceeding database limit."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Set to maximum
        account.database_count = account.subscription.max_databases

        with pytest.raises(BusinessRuleViolation, match="Cannot create more databases"):
            account.increment_database_count()

    def test_upgrades_subscription_correctly(self):
        """Should upgrade subscription plan and limits."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Upgrade from trial to basic
        account.upgrade_subscription(SubscriptionPlan.BASIC)

        assert account.subscription.plan == SubscriptionPlan.BASIC
        assert account.subscription.storage_quota.to_megabytes() == 1000
        assert account.subscription.max_databases == 10

    def test_calculates_storage_usage_percentage(self):
        """Should calculate storage usage percentage correctly."""
        account = CustomerAccount(
            name=TenantName("Test Company"),
            email=EmailAddress("test@company.com"),
            status=CustomerAccountStatus.ACTIVE,
        )

        # Use 50% of 100MB quota
        account.allocate_storage(StorageSize(50, StorageUnit.MB))

        assert account.storage_usage_percentage == 50.0

    def test_identifies_trial_accounts(self):
        """Should identify trial accounts correctly."""
        account = CustomerAccount(
            name=TenantName("Test Company"), email=EmailAddress("test@company.com")
        )

        assert account.is_trial_account

        account.upgrade_subscription(SubscriptionPlan.BASIC)
        assert not account.is_trial_account
