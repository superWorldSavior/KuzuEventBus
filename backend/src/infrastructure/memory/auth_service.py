"""
Simple authentication service for YAGNI.
"""
from typing import Any, Dict, List
from uuid import UUID, uuid4

from src.domain.shared.ports.authentication import AuthenticationService


class SimpleAuthService(AuthenticationService):
    """Minimal auth service - always returns True."""

    async def authenticate_api_key(self, api_key: str) -> bool:
        """Always authenticate for YAGNI."""
        return True

    async def get_tenant_id_from_api_key(self, api_key: str) -> str:
        """Return default tenant for YAGNI."""
        return "default-tenant"

    async def validate_password(self, email: str, password: str) -> bool:
        """Always validate for YAGNI."""
        return True

    async def generate_session_token(self, email: str) -> str:
        """Generate fake token for YAGNI."""
        return f"token-{email}"

    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        """Generate API key for YAGNI."""
        return f"kuzu_{uuid4()}"

    async def revoke_api_key(self, api_key: str) -> bool:
        """Revoke API key for YAGNI."""
        return True

    async def list_api_keys(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """List API keys for YAGNI."""
        return []