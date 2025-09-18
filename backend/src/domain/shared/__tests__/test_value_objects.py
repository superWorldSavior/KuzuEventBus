"""
Tests for shared domain value objects.

Following TDD principles - these tests define the expected behavior.
"""
from uuid import UUID

import pytest

from ..value_objects import (
    DomainEvent,
    EmailAddress,
    EntityId,
    StorageSize,
    StorageUnit,
    TenantName,
    ValidationError,
)


class TestEntityId:
    """Test cases for EntityId value object."""

    def test_creates_valid_entity_id(self):
        """Should create a valid EntityId with UUID."""
        entity_id = EntityId()
        assert isinstance(entity_id.value, UUID)
        assert str(entity_id) == str(entity_id.value)

    def test_creates_entity_id_from_string(self):
        """Should create EntityId from valid UUID string."""
        uuid_str = "550e8400-e29b-41d4-a716-446655440000"
        entity_id = EntityId.from_string(uuid_str)
        assert str(entity_id.value) == uuid_str

    def test_fails_with_invalid_uuid_string(self):
        """Should raise ValidationError for invalid UUID string."""
        with pytest.raises(ValidationError, match="Invalid entity ID format"):
            EntityId.from_string("invalid-uuid")


class TestStorageSize:
    """Test cases for StorageSize value object."""

    def test_creates_valid_storage_size(self):
        """Should create valid storage size."""
        size = StorageSize(100, StorageUnit.MB)
        assert size.amount == 100
        assert size.unit == StorageUnit.MB

    def test_converts_to_megabytes_correctly(self):
        """Should convert different units to megabytes."""
        assert StorageSize(1024, StorageUnit.KB).to_megabytes() == 1.0
        assert StorageSize(1, StorageUnit.GB).to_megabytes() == 1024.0
        assert StorageSize(100, StorageUnit.MB).to_megabytes() == 100.0

    def test_converts_to_bytes_correctly(self):
        """Should convert to bytes correctly."""
        size = StorageSize(1, StorageUnit.MB)
        assert size.to_bytes() == 1024 * 1024

    def test_adds_storage_sizes(self):
        """Should add storage sizes correctly."""
        size1 = StorageSize(100, StorageUnit.MB)
        size2 = StorageSize(1, StorageUnit.GB)
        result = size1 + size2
        assert result.to_megabytes() == 1124.0  # 100 + 1024

    def test_subtracts_storage_sizes(self):
        """Should subtract storage sizes correctly."""
        size1 = StorageSize(1, StorageUnit.GB)
        size2 = StorageSize(100, StorageUnit.MB)
        result = size1 - size2
        assert result.to_megabytes() == 924.0  # 1024 - 100

    def test_subtraction_never_goes_negative(self):
        """Should never allow negative storage after subtraction."""
        size1 = StorageSize(100, StorageUnit.MB)
        size2 = StorageSize(200, StorageUnit.MB)
        result = size1 - size2
        assert result.to_megabytes() == 0.0

    def test_compares_storage_sizes(self):
        """Should compare storage sizes correctly."""
        size1 = StorageSize(1, StorageUnit.GB)
        size2 = StorageSize(500, StorageUnit.MB)
        assert size1 > size2

    def test_fails_with_negative_amount(self):
        """Should raise ValidationError for negative amounts."""
        with pytest.raises(ValidationError, match="Storage size cannot be negative"):
            StorageSize(-10, StorageUnit.MB)


class TestEmailAddress:
    """Test cases for EmailAddress value object."""

    def test_creates_valid_email(self):
        """Should create valid email address."""
        email = EmailAddress("test@example.com")
        assert email.value == "test@example.com"

    def test_normalizes_email_case(self):
        """Should normalize email to lowercase."""
        email = EmailAddress("TEST@EXAMPLE.COM")
        assert email.value == "test@example.com"

    def test_trims_whitespace(self):
        """Should trim whitespace from email."""
        email = EmailAddress("  test@example.com  ")
        assert email.value == "test@example.com"

    def test_fails_with_invalid_email_formats(self):
        """Should raise ValidationError for invalid email formats."""
        invalid_emails = ["invalid", "@example.com", "test@", "test@example", "", "   "]

        for invalid_email in invalid_emails:
            with pytest.raises(ValidationError, match="Invalid email address"):
                EmailAddress(invalid_email)


class TestTenantName:
    """Test cases for TenantName value object."""

    def test_creates_valid_tenant_name(self):
        """Should create valid tenant name."""
        name = TenantName("Valid Company")
        assert name.value == "Valid Company"

    def test_trims_whitespace(self):
        """Should trim whitespace from tenant name."""
        name = TenantName("  Company Name  ")
        assert name.value == "Company Name"

    def test_allows_valid_characters(self):
        """Should allow alphanumeric, spaces, hyphens, underscores."""
        valid_names = [
            "Company-123",
            "Company_Name",
            "My Company 2024",
            "Tech-Corp_Ltd",
        ]

        for valid_name in valid_names:
            name = TenantName(valid_name)
            assert name.value == valid_name

    def test_fails_with_too_short_name(self):
        """Should raise ValidationError for names shorter than 3 characters."""
        with pytest.raises(ValidationError, match="must be at least 3 characters"):
            TenantName("AB")

    def test_fails_with_too_long_name(self):
        """Should raise ValidationError for names longer than 50 characters."""
        long_name = "A" * 51
        with pytest.raises(ValidationError, match="cannot exceed 50 characters"):
            TenantName(long_name)

    def test_fails_with_invalid_characters(self):
        """Should raise ValidationError for invalid characters."""
        invalid_names = ["Company@Corp", "Company#1", "Company$$$", "Company%Ltd"]

        for invalid_name in invalid_names:
            with pytest.raises(ValidationError, match="contains invalid characters"):
                TenantName(invalid_name)

    def test_fails_with_empty_name(self):
        """Should raise ValidationError for empty names."""
        with pytest.raises(ValidationError, match="must be at least 3 characters"):
            TenantName("")


class TestDomainEvent:
    """Test cases for DomainEvent base class."""

    def test_creates_domain_event_with_defaults(self):
        """Should create domain event with default values."""
        event = DomainEvent()
        assert isinstance(event.event_id, EntityId)
        assert event.event_type == "DomainEvent"
        assert isinstance(event.aggregate_id, EntityId)
        assert event.data == {}

    def test_creates_domain_event_with_custom_data(self):
        """Should create domain event with custom data."""
        aggregate_id = EntityId()
        event_data = {"key": "value"}

        event = DomainEvent(
            aggregate_id=aggregate_id, event_type="CustomEvent", data=event_data
        )

        assert event.aggregate_id == aggregate_id
        assert event.event_type == "CustomEvent"
        assert event.data == event_data
