"""
Customer Account DTOs for API requests and responses.

Pydantic models for customer registration, authentication, and account management.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class CustomerRegistrationRequest(BaseModel):
    """Request model for customer registration."""

    tenant_name: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$",
        description="Unique tenant identifier (alphanumeric and hyphens only)",
    )
    admin_email: EmailStr = Field(..., description="Administrator email address")
    organization_name: str = Field(
        ..., min_length=2, max_length=100, description="Organization display name"
    )

    @field_validator("tenant_name")
    @classmethod
    def validate_tenant_name(cls, v):
        """Validate tenant name format."""
        if "--" in v:
            raise ValueError("Consecutive hyphens not allowed")
        if v.startswith("-") or v.endswith("-"):
            raise ValueError("Cannot start or end with hyphen")
        return v.lower()


class CustomerRegistrationResponse(BaseModel):
    """Response model for customer registration."""

    customer_id: UUID = Field(..., description="Unique customer identifier")
    tenant_name: str = Field(..., description="Tenant name")
    organization_name: str = Field(..., description="Organization name")
    admin_email: EmailStr = Field(..., description="Administrator email")
    api_key: str = Field(..., description="Initial API key")
    subscription_status: str = Field(..., description="Account status")
    created_at: datetime = Field(..., description="Account creation timestamp")


class CustomerAccountResponse(BaseModel):
    """Response model for customer account details."""

    customer_id: UUID = Field(..., description="Unique customer identifier")
    tenant_name: str = Field(..., description="Tenant name")
    admin_email: EmailStr = Field(..., description="Administrator email")
    subscription_status: str = Field(..., description="Account status")
    max_databases: int = Field(..., description="Maximum number of databases")
    max_concurrent_queries: int = Field(..., description="Maximum concurrent queries")
    storage_quota_gb: float = Field(..., description="Storage quota in GB")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_activity: Optional[datetime] = Field(
        None, description="Last activity timestamp"
    )


class ApiKeyCreateRequest(BaseModel):
    """Request model for creating API keys."""

    key_name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Human-readable name for the API key",
    )
    permissions: List[str] = Field(
        ..., min_items=1, description="List of permissions for the API key"
    )

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, v):
        """Validate permission format."""
        valid_resources = ["database", "query", "admin"]
        valid_actions = ["read", "write", "execute", "delete", "manage"]

        for perm in v:
            if ":" not in perm:
                raise ValueError(
                    f"Permission '{perm}' must be in format 'resource:action'"
                )

            resource, action = perm.split(":", 1)
            if resource not in valid_resources:
                raise ValueError(
                    f"Invalid resource '{resource}'. Must be one of: {valid_resources}"
                )
            if action not in valid_actions:
                raise ValueError(
                    f"Invalid action '{action}'. Must be one of: {valid_actions}"
                )

        return v


class ApiKeyCreateResponse(BaseModel):
    """Response model for API key creation."""

    api_key: str = Field(..., description="Generated API key")
    created_at: datetime = Field(..., description="Creation timestamp")


class ApiKeyListResponse(BaseModel):
    """Response model for listing API keys."""

    key_id: str = Field(..., description="API key identifier")
    name: str = Field(..., description="API key name")
    permissions: List[str] = Field(..., description="API key permissions")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_used: Optional[datetime] = Field(None, description="Last usage timestamp")
    is_active: bool = Field(..., description="Whether key is active")


class SubscriptionUpdateRequest(BaseModel):
    """Request model for updating subscription status."""

    status: str = Field(
        ...,
        pattern=r"^(active|suspended|trial|expired)$",
        description="New subscription status",
    )
    reason: Optional[str] = Field(
        None, max_length=500, description="Optional reason for status change"
    )


class ErrorResponse(BaseModel):
    """Standard error response model."""

    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Error timestamp"
    )


class SuccessResponse(BaseModel):
    """Standard success response model."""

    success: bool = Field(True, description="Operation success indicator")
    message: str = Field(..., description="Success message")
    data: Optional[dict] = Field(None, description="Optional response data")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )
