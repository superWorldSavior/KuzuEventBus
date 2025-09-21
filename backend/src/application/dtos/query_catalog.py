from __future__ import annotations

from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, Field


class PopularQueryItem(BaseModel):
    query_hash: str = Field(..., description="Stable hash of normalized query")
    query_text: str = Field(..., description="Normalized query text")
    usage_count: int = Field(..., ge=0)
    last_used_at: datetime = Field(...)


class FavoriteQueryItem(BaseModel):
    query_hash: str = Field(...)
    query_text: str = Field(...)
    created_at: datetime = Field(...)


class AddFavoriteRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000)


class RemoveFavoriteResponse(BaseModel):
    removed: bool = Field(...)
