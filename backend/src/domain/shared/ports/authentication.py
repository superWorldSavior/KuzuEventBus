"""
Authentication and Authorization domain ports.

Service protocols for API authentication and authorization management.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
from uuid import UUID


@runtime_checkable
class AuthenticationService(Protocol):
    """Protocol for API key authentication."""

    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Validate API key and return tenant information.

        Returns:
            Dict with tenant_id, account_status, rate_limits, etc. if valid
            None if invalid
        """
        ...

    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        """Generate new API key for tenant."""
        ...

    async def revoke_api_key(self, api_key: str) -> bool:
        """Revoke an API key."""
        ...

    async def list_api_keys(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """List all API keys for a tenant."""
        ...


@runtime_checkable
class AuthorizationService(Protocol):
    """Protocol for request authorization."""

    async def check_permission(
        self, tenant_id: UUID, resource: str, action: str
    ) -> bool:
        """Check if tenant has permission for resource/action."""
        ...

    async def check_rate_limit(self, tenant_id: UUID, endpoint: str) -> Dict[str, Any]:
        """
        Check rate limit status.

        Returns:
            Dict with allowed: bool, remaining: int, reset_time: datetime
        """
        ...

    async def check_quota(
        self, tenant_id: UUID, resource_type: str, requested_amount: int = 1
    ) -> Dict[str, Any]:
        """
        Check resource quota.

        Returns:
            Dict with allowed: bool, used: int, limit: int
        """
        ...


@runtime_checkable
class SessionService(Protocol):
    """Protocol for session management."""

    async def create_session(self, tenant_id: UUID, metadata: Dict[str, Any]) -> str:
        """Create new session and return session token."""
        ...

    async def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return session data."""
        ...

    async def refresh_session(self, session_token: str) -> Optional[str]:
        """Refresh session and return new token."""
        ...

    async def terminate_session(self, session_token: str) -> bool:
        """Terminate session."""
        ...

    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions. Returns count of cleaned sessions."""
        ...
