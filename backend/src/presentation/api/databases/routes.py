"""Database management router.

The database management API is not yet implemented. Endpoints return
HTTP 501 to indicate that the feature is planned but not available.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from typing import List, Optional

from src.infrastructure.logging.config import get_logger

router = APIRouter()
db_logger = get_logger("database_operations")


class CreateDatabaseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Database name")
    description: Optional[str] = Field(None, max_length=500, description="Database description")


class DatabaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    created_at: str
    size_bytes: int
    tenant_id: str


class DatabaseListResponse(BaseModel):
    tenant: str
    databases: List[DatabaseResponse]
    total_count: int
    total_size_bytes: int


def _not_implemented() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Database management endpoints are not implemented yet",
    )


@router.get("/", response_model=DatabaseListResponse)
async def list_databases(request: Request) -> DatabaseListResponse:
    db_logger.info("Database listing requested", path=request.url.path)
    _not_implemented()


@router.post("/", response_model=DatabaseResponse, status_code=status.HTTP_201_CREATED)
async def create_database(request: Request, create_request: CreateDatabaseRequest) -> DatabaseResponse:
    db_logger.info("Database creation requested", name=create_request.name)
    _not_implemented()


@router.get("/{database_id}", response_model=DatabaseResponse)
async def get_database(request: Request, database_id: str) -> DatabaseResponse:
    db_logger.info("Database lookup requested", database_id=database_id)
    _not_implemented()


@router.delete("/{database_id}")
async def delete_database(request: Request, database_id: str) -> None:
    db_logger.info("Database deletion requested", database_id=database_id)
    _not_implemented()
