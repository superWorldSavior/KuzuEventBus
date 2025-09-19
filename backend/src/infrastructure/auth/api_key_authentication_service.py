"""API Key based authentication service implementation.

In-memory implementation for generating, validating, revoking and
listing tenant API keys. Designed for MVP & tests; future adapters can
persist keys and enforce rotation / expiry policies without changing
application layer code.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from src.domain.shared.ports.authentication import AuthenticationService


class ApiKeyAuthenticationService(AuthenticationService):
    """In-memory API key authentication & management."""

    def __init__(self) -> None:
        self._keys: Dict[str, Dict[str, Any]] = {}

    async def generate_api_key(
        self, tenant_id: UUID, key_name: str, permissions: List[str]
    ) -> str:
        api_key = f"kb_{secrets.token_urlsafe(32)}"
        self._keys[api_key] = {
            "tenant_id": tenant_id,
            "key_name": key_name,
            "permissions": permissions,
            "revoked": False,
            "created_at": datetime.now(timezone.utc),
        }
        return api_key

    async def revoke_api_key(self, api_key: str) -> bool:
        rec = self._keys.get(api_key)
        if not rec or rec["revoked"]:
            return False
        rec["revoked"] = True
        rec["revoked_at"] = datetime.now(timezone.utc)
        return True

    async def list_api_keys(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        for key, rec in self._keys.items():
            if rec["tenant_id"] == tenant_id:
                result.append(
                    {
                        "api_key": key,
                        "key_name": rec["key_name"],
                        "permissions": rec["permissions"],
                        "revoked": rec["revoked"],
                        "created_at": rec["created_at"].isoformat(),
                        "revoked_at": rec.get("revoked_at").isoformat()
                        if rec.get("revoked_at")
                        else None,
                    }
                )
        return result

    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        rec = self._keys.get(api_key)
        if not rec or rec.get("revoked"):
            return None
        return {
            "tenant_id": rec["tenant_id"],
            "permissions": rec["permissions"],
            "key_name": rec["key_name"],
            "active": True,
        }
