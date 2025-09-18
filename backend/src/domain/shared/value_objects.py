"""
Shared domain types and base classes.

Contains common types, exceptions, and base classes used across all domain modules.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict
from uuid import UUID, uuid4
from dataclasses import dataclass, field


class DomainException(Exception):
    """Base exception for all domain errors."""
    pass


class ValidationError(DomainException):
    """Raised when domain validation fails."""
    pass


class BusinessRuleViolation(DomainException):
    """Raised when business rules are violated."""
    pass


class ResourceNotFoundError(DomainException):
    """Raised when a required resource is not found."""
    pass


@dataclass(frozen=True)
class EntityId:
    """Strong-typed entity identifier."""
    value: UUID = field(default_factory=uuid4)
    
    def __str__(self) -> str:
        return str(self.value)
    
    @classmethod
    def from_string(cls, id_str: str) -> "EntityId":
        """Create EntityId from string representation."""
        try:
            return cls(UUID(id_str))
        except ValueError as e:
            raise ValidationError(f"Invalid entity ID format: {id_str}") from e


@dataclass
class DomainEvent:
    """Base class for domain events."""
    event_id: EntityId = field(default_factory=EntityId)
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    event_type: str = field(default="")
    aggregate_id: EntityId = field(default_factory=EntityId)
    data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self) -> None:
        if not self.event_type:
            self.event_type = self.__class__.__name__


class StorageUnit(Enum):
    """Storage unit enumeration."""
    BYTES = "bytes"
    KB = "kilobytes"
    MB = "megabytes"
    GB = "gigabytes"


@dataclass(frozen=True)
class StorageSize:
    """Value object for storage sizes with automatic unit conversion."""
    amount: float
    unit: StorageUnit = StorageUnit.MB
    
    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValidationError("Storage size cannot be negative")
    
    def to_megabytes(self) -> float:
        """Convert storage size to megabytes."""
        conversions = {
            StorageUnit.BYTES: self.amount / (1024 * 1024),
            StorageUnit.KB: self.amount / 1024,
            StorageUnit.MB: self.amount,
            StorageUnit.GB: self.amount * 1024
        }
        return conversions[self.unit]
    
    def to_bytes(self) -> int:
        """Convert storage size to bytes."""
        return int(self.to_megabytes() * 1024 * 1024)
    
    def __add__(self, other: "StorageSize") -> "StorageSize":
        """Add two storage sizes (result in MB)."""
        total_mb = self.to_megabytes() + other.to_megabytes()
        return StorageSize(total_mb, StorageUnit.MB)
    
    def __sub__(self, other: "StorageSize") -> "StorageSize":
        """Subtract two storage sizes (result in MB)."""
        total_mb = self.to_megabytes() - other.to_megabytes()
        if total_mb < 0:
            total_mb = 0
        return StorageSize(total_mb, StorageUnit.MB)
    
    def __gt__(self, other: "StorageSize") -> bool:
        """Compare storage sizes."""
        return self.to_megabytes() > other.to_megabytes()
    
    def __str__(self) -> str:
        return f"{self.amount} {self.unit.value}"


@dataclass(frozen=True)
class EmailAddress:
    """Value object for email addresses."""
    value: str
    
    def __post_init__(self) -> None:
        email = self.value.strip().lower()
        
        # Basic validation checks
        if not email:
            raise ValidationError(f"Invalid email address: {self.value}")
        
        if "@" not in email:
            raise ValidationError(f"Invalid email address: {self.value}")
        
        # Split by @ and validate structure
        parts = email.split("@")
        if len(parts) != 2:
            raise ValidationError(f"Invalid email address: {self.value}")
        
        local_part, domain_part = parts
        if not local_part or not domain_part:
            raise ValidationError(f"Invalid email address: {self.value}")
        
        # Domain must contain at least one dot
        if "." not in domain_part:
            raise ValidationError(f"Invalid email address: {self.value}")
        
        # Update the value using object.__setattr__ since dataclass is frozen
        object.__setattr__(self, 'value', email)
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class TenantName:
    """Value object for tenant names."""
    value: str
    
    def __post_init__(self) -> None:
        name = self.value.strip()
        if not name or len(name) < 3:
            raise ValidationError("Tenant name must be at least 3 characters")
        if len(name) > 50:
            raise ValidationError("Tenant name cannot exceed 50 characters")
        # Only allow alphanumeric, spaces, hyphens, underscores
        if not all(c.isalnum() or c in [' ', '-', '_'] for c in name):
            raise ValidationError("Tenant name contains invalid characters")
        object.__setattr__(self, 'value', name)
    
    def __str__(self) -> str:
        return self.value