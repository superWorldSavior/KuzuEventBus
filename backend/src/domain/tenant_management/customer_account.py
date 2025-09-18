"""
Tenant Management Domain - Customer Account Entity

Represents a customer account in the multi-tenant Kuzu Event Bus system.
Handles subscription management, API access, and storage quotas.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from dataclasses import dataclass, field
import secrets

from ..shared.value_objects import (
    EntityId, DomainEvent, StorageSize, StorageUnit, 
    EmailAddress, TenantName, ValidationError, BusinessRuleViolation
)


class CustomerAccountStatus(Enum):
    """Customer account status lifecycle."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    EXPIRED = "expired"
    DELETED = "deleted"


class SubscriptionPlan(Enum):
    """Available subscription plans."""
    TRIAL = "trial"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


@dataclass
class CustomerAccountCreated(DomainEvent):
    """Event raised when a new customer account is created."""
    pass


@dataclass
class CustomerAccountSuspended(DomainEvent):
    """Event raised when a customer account is suspended."""
    reason: str = ""


@dataclass
class CustomerAccountActivated(DomainEvent):
    """Event raised when a customer account is activated."""
    pass


@dataclass
class StorageQuotaExceeded(DomainEvent):
    """Event raised when storage quota is exceeded."""
    current_usage: StorageSize = field(default_factory=lambda: StorageSize(0))
    quota_limit: StorageSize = field(default_factory=lambda: StorageSize(0))


@dataclass
class ApiKey:
    """Value object for API key with validation."""
    value: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = field(default=None)
    is_active: bool = field(default=True)
    
    def __post_init__(self) -> None:
        if not self.value.startswith("kb_"):
            raise ValidationError("API key must start with 'kb_' prefix")
        if len(self.value) < 35:  # kb_ + 32 chars minimum
            raise ValidationError("API key is too short")
    
    @classmethod
    def generate(cls) -> "ApiKey":
        """Generate a new API key."""
        key_value = f"kb_{secrets.token_urlsafe(32)}"
        return cls(value=key_value)
    
    def mark_as_used(self) -> None:
        """Mark API key as recently used."""
        if not self.is_active:
            raise BusinessRuleViolation("Cannot use inactive API key")
        object.__setattr__(self, 'last_used', datetime.utcnow())
    
    def deactivate(self) -> None:
        """Deactivate the API key."""
        object.__setattr__(self, 'is_active', False)


@dataclass
class SubscriptionDetails:
    """Value object for subscription information."""
    plan: SubscriptionPlan
    storage_quota: StorageSize
    max_databases: int
    max_concurrent_queries: int
    started_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = field(default=None)
    
    def __post_init__(self) -> None:
        if self.max_databases <= 0:
            raise ValidationError("Maximum databases must be positive")
        if self.max_concurrent_queries <= 0:
            raise ValidationError("Maximum concurrent queries must be positive")
    
    def is_expired(self) -> bool:
        """Check if subscription has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def days_until_expiration(self) -> Optional[int]:
        """Get days until subscription expires."""
        if not self.expires_at:
            return None
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)


@dataclass
class CustomerAccount:
    """
    Customer Account aggregate root.
    
    Manages customer lifecycle, subscription, API access, and storage quotas.
    Enforces business rules around multi-tenancy and resource limits.
    """
    # Identity
    id: EntityId = field(default_factory=EntityId)
    name: TenantName = field(default_factory=lambda: TenantName("Default"))
    email: EmailAddress = field(default_factory=lambda: EmailAddress("default@example.com"))
    
    # Access Control
    api_key: ApiKey = field(default_factory=ApiKey.generate)
    status: CustomerAccountStatus = field(default=CustomerAccountStatus.TRIAL)
    
    # Subscription & Limits
    subscription: SubscriptionDetails = field(default_factory=lambda: SubscriptionDetails(
        plan=SubscriptionPlan.TRIAL,
        storage_quota=StorageSize(100, StorageUnit.MB),
        max_databases=3,
        max_concurrent_queries=5
    ))
    
    # Usage Tracking
    current_storage_usage: StorageSize = field(default_factory=lambda: StorageSize(0))
    database_count: int = field(default=0)
    
    # Audit Trail
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = field(default=None)
    
    # Domain Events
    _events: List[DomainEvent] = field(default_factory=list, init=False)
    
    def __post_init__(self) -> None:
        """Initialize customer account and validate invariants."""
        if self.database_count < 0:
            raise ValidationError("Database count cannot be negative")
        
        # Raise domain event for new account
        if not hasattr(self, '_events'):
            self._events = []
        
        # If this is a new account (no created_at override), emit event
        creation_threshold = datetime.utcnow().timestamp() - self.created_at.timestamp()
        if abs(creation_threshold) < 1:  # Created within 1 second
            self._add_event(CustomerAccountCreated(aggregate_id=self.id))
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event to the list."""
        self._events.append(event)
    
    def get_uncommitted_events(self) -> List[DomainEvent]:
        """Get all uncommitted domain events."""
        return self._events.copy()
    
    def mark_events_as_committed(self) -> None:
        """Mark all events as committed."""
        self._events.clear()
    
    def suspend_account(self, reason: str) -> None:
        """Suspend customer account access."""
        if self.status == CustomerAccountStatus.DELETED:
            raise BusinessRuleViolation("Cannot suspend deleted account")
        
        if self.status == CustomerAccountStatus.SUSPENDED:
            raise BusinessRuleViolation("Account is already suspended")
        
        self.status = CustomerAccountStatus.SUSPENDED
        self.api_key.deactivate()
        self.updated_at = datetime.utcnow()
        
        self._add_event(CustomerAccountSuspended(
            aggregate_id=self.id,
            data={"reason": reason}
        ))
    
    def activate_account(self) -> None:
        """Activate customer account."""
        if self.status == CustomerAccountStatus.DELETED:
            raise BusinessRuleViolation("Cannot activate deleted account")
        
        # Check subscription expiration
        if self.subscription.is_expired():
            raise BusinessRuleViolation("Cannot activate account with expired subscription")
        
        self.status = CustomerAccountStatus.ACTIVE
        # Generate new API key if current one is inactive
        if not self.api_key.is_active:
            self.api_key = ApiKey.generate()
        
        self.updated_at = datetime.utcnow()
        
        self._add_event(CustomerAccountActivated(aggregate_id=self.id))
    
    def can_create_database(self) -> bool:
        """Check if customer can create a new database."""
        return (
            self.status == CustomerAccountStatus.ACTIVE and
            self.database_count < self.subscription.max_databases and
            not self.subscription.is_expired()
        )
    
    def can_upload_file(self, file_size: StorageSize) -> bool:
        """Check if customer can upload a file of given size."""
        if self.status != CustomerAccountStatus.ACTIVE:
            return False
        
        if self.subscription.is_expired():
            return False
        
        total_after_upload = self.current_storage_usage + file_size
        return not (total_after_upload > self.subscription.storage_quota)
    
    def allocate_storage(self, size: StorageSize) -> None:
        """Allocate storage for file upload."""
        if not self.can_upload_file(size):
            raise BusinessRuleViolation("Storage allocation would exceed quota")
        
        self.current_storage_usage += size
        self.updated_at = datetime.utcnow()
        
        # Check if approaching quota (90%)
        quota_mb = self.subscription.storage_quota.to_megabytes()
        usage_mb = self.current_storage_usage.to_megabytes()
        
        if usage_mb >= quota_mb * 0.9:
            self._add_event(StorageQuotaExceeded(
                aggregate_id=self.id,
                data={
                    "current_usage_mb": usage_mb,
                    "quota_mb": quota_mb,
                    "usage_percentage": (usage_mb / quota_mb) * 100
                }
            ))
    
    def deallocate_storage(self, size: StorageSize) -> None:
        """Deallocate storage when files are deleted."""
        self.current_storage_usage -= size
        self.updated_at = datetime.utcnow()
    
    def increment_database_count(self) -> None:
        """Increment database count when new database is created."""
        if not self.can_create_database():
            raise BusinessRuleViolation("Cannot create more databases")
        
        self.database_count += 1
        self.updated_at = datetime.utcnow()
    
    def decrement_database_count(self) -> None:
        """Decrement database count when database is deleted."""
        if self.database_count > 0:
            self.database_count -= 1
            self.updated_at = datetime.utcnow()
    
    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login = datetime.utcnow()
        self.api_key.mark_as_used()
    
    def upgrade_subscription(self, new_plan: SubscriptionPlan) -> None:
        """Upgrade customer subscription plan."""
        if self.status == CustomerAccountStatus.DELETED:
            raise BusinessRuleViolation("Cannot upgrade deleted account")
        
        # Define plan limits (could be moved to a configuration service)
        plan_limits = {
            SubscriptionPlan.TRIAL: {
                "storage_mb": 100,
                "max_databases": 3,
                "max_queries": 5
            },
            SubscriptionPlan.BASIC: {
                "storage_mb": 1000,
                "max_databases": 10,
                "max_queries": 20
            },
            SubscriptionPlan.PROFESSIONAL: {
                "storage_mb": 10000,
                "max_databases": 50,
                "max_queries": 100
            },
            SubscriptionPlan.ENTERPRISE: {
                "storage_mb": 100000,
                "max_databases": 1000,
                "max_queries": 1000
            }
        }
        
        limits = plan_limits[new_plan]
        
        self.subscription = SubscriptionDetails(
            plan=new_plan,
            storage_quota=StorageSize(limits["storage_mb"], StorageUnit.MB),
            max_databases=limits["max_databases"],
            max_concurrent_queries=limits["max_queries"]
        )
        
        self.updated_at = datetime.utcnow()
    
    @property
    def storage_usage_percentage(self) -> float:
        """Get storage usage as percentage of quota."""
        quota_mb = self.subscription.storage_quota.to_megabytes()
        if quota_mb == 0:
            return 0.0
        
        usage_mb = self.current_storage_usage.to_megabytes()
        return min(100.0, (usage_mb / quota_mb) * 100)
    
    @property
    def is_trial_account(self) -> bool:
        """Check if this is a trial account."""
        return self.subscription.plan == SubscriptionPlan.TRIAL
    
    @property
    def days_until_subscription_expires(self) -> Optional[int]:
        """Get days until subscription expires."""
        return self.subscription.days_until_expiration()