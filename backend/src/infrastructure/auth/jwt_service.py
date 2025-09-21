from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional

from jose import jwt, JWTError

DEFAULT_JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
DEFAULT_JWT_ISSUER = os.getenv("JWT_ISSUER", "kuzu-event-bus")
DEFAULT_JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "kuzu-event-bus-clients")
DEFAULT_JWT_TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", "300"))  # 5 minutes


class JwtService:
    def __init__(
        self,
        secret: str = DEFAULT_JWT_SECRET,
        issuer: str = DEFAULT_JWT_ISSUER,
        audience: str = DEFAULT_JWT_AUDIENCE,
        ttl_seconds: int = DEFAULT_JWT_TTL_SECONDS,
        algorithm: str = "HS256",
    ) -> None:
        self._secret = secret
        self._issuer = issuer
        self._audience = audience
        self._ttl_seconds = ttl_seconds
        self._algorithm = algorithm

    def issue_sse_token(
        self,
        *,
        tenant_id: str,
        tenant_name: str,
        customer_id: str,
        scope: str = "sse:read",
        ttl_seconds: Optional[int] = None,
    ) -> str:
        now = int(time.time())
        exp = now + int(ttl_seconds or self._ttl_seconds)
        payload: Dict[str, Any] = {
            "sub": customer_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "scope": scope,
            "iat": now,
            "nbf": now,
            "exp": exp,
            "iss": self._issuer,
            "aud": self._audience,
        }
        token = jwt.encode(payload, self._secret, algorithm=self._algorithm)
        return token

    def verify_sse_token(self, token: str) -> Dict[str, Any]:
        try:
            claims = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["exp", "iat", "nbf", "aud", "iss"], "verify_exp": True},
            )
            if claims.get("scope") != "sse:read":
                raise JWTError("invalid scope")
            # Minimal shape validation
            if not claims.get("tenant_id") or not claims.get("tenant_name") or not claims.get("sub"):
                raise JWTError("invalid claims")
            return claims
        except JWTError as e:
            raise e


_jwt_singleton: Optional[JwtService] = None


def jwt_service() -> JwtService:
    global _jwt_singleton
    if _jwt_singleton is None:
        _jwt_singleton = JwtService()
    return _jwt_singleton
