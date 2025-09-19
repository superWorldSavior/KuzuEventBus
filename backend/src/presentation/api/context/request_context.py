from __future__ import annotations

from dataclasses import dataclass
from typing import List
from uuid import UUID

from fastapi import HTTPException, Request, status


@dataclass(frozen=True)
class RequestContext:
    tenant_id: UUID
    tenant_name: str
    api_key_suffix: str
    permissions: List[str]


def get_request_context(request: Request) -> RequestContext:
    ctx = getattr(request.state, "tenant_context", None)
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
    return ctx
