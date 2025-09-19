"""Testing auth service (dev/test only).

Implements AuthenticationService with simple behavior and kb_-prefixed API key
generation to satisfy domain validation.
"""
from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID, uuid4

from src.domain.shared.ports.authentication import AuthenticationService


class TestingAuthService(AuthenticationService):
    async def authenticate_api_key(self, api_key: str) -> bool:
        return True

    async def get_tenant_id_from_api_key(self, api_key: str) -> str:
        return "default-tenant"

    async def validate_password(self, email: str, password: str) -> bool:
        return True

    async def generate_session_token(self, email: str) -> str:
        return f"token-{email}"

    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        return f"kb_{uuid4().hex}"

    async def revoke_api_key(self, api_key: str) -> bool:
        return True

    async def list_api_keys(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        return []

