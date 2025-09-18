"""
Database Management DTOs for API requests and responses.

Pydantic models for database creation, management, and file operations.
"""
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class DatabaseCreateRequest(BaseModel):
    """Request model for database creation."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-zA-Z][a-zA-Z0-9_-]*$",
        description="Database name (alphanumeric, underscore, hyphen)",
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Optional database description"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        """Validate database name."""
        if v.lower() in ["admin", "system", "config", "default"]:
            raise ValueError(f"Database name '{v}' is reserved")
        return v


class DatabaseCreateResponse(BaseModel):
    """Response model for database creation."""

    database_id: UUID = Field(..., description="Unique database identifier")
    name: str = Field(..., description="Database name")
    description: Optional[str] = Field(None, description="Database description")
    created_at: datetime = Field(..., description="Creation timestamp")
    size_bytes: int = Field(..., description="Database size in bytes")
    table_count: int = Field(..., description="Number of tables")


class DatabaseListResponse(BaseModel):
    """Response model for database listing."""

    database_id: UUID = Field(..., description="Unique database identifier")
    name: str = Field(..., description="Database name")
    description: Optional[str] = Field(None, description="Database description")
    created_at: datetime = Field(..., description="Creation timestamp")
    size_bytes: int = Field(..., description="Database size in bytes")
    table_count: int = Field(..., description="Number of tables")
    last_accessed: Optional[datetime] = Field(None, description="Last access timestamp")


class DatabaseInfoResponse(BaseModel):
    """Response model for detailed database information."""

    database_id: UUID = Field(..., description="Unique database identifier")
    name: str = Field(..., description="Database name")
    description: Optional[str] = Field(None, description="Database description")
    tenant_id: UUID = Field(..., description="Owner tenant ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    size_bytes: int = Field(..., description="Database size in bytes")
    table_count: int = Field(..., description="Number of tables")
    schema: Optional[dict] = Field(None, description="Database schema information")
    last_accessed: Optional[datetime] = Field(None, description="Last access timestamp")


class FileUploadRequest(BaseModel):
    """Request model for file upload metadata."""

    file_name: str = Field(
        ..., min_length=1, max_length=255, description="Name of the file to upload"
    )
    content_type: Optional[str] = Field(
        "application/octet-stream", description="MIME type of the file"
    )

    @field_validator("file_name")
    @classmethod
    def validate_file_name(cls, v):
        """Validate file name."""
        forbidden_chars = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
        if any(char in v for char in forbidden_chars):
            raise ValueError(
                f"File name contains forbidden characters: {forbidden_chars}"
            )

        if v.startswith("."):
            raise ValueError("File name cannot start with dot")

        return v


class FileUploadResponse(BaseModel):
    """Response model for file upload."""

    file_path: str = Field(..., description="File path in storage")
    file_size: int = Field(..., description="File size in bytes")
    upload_url: Optional[str] = Field(
        None, description="Direct upload URL if applicable"
    )
    uploaded_at: datetime = Field(..., description="Upload timestamp")


class DatabaseStatsResponse(BaseModel):
    """Response model for database statistics."""

    total_databases: int = Field(..., description="Total number of databases")
    total_size_bytes: int = Field(..., description="Total storage used in bytes")
    total_size_gb: float = Field(..., description="Total storage used in GB")
    databases_by_status: dict = Field(..., description="Count of databases by status")
    average_size_bytes: float = Field(..., description="Average database size")
    largest_database: Optional[dict] = Field(
        None, description="Information about largest database"
    )
    oldest_database: Optional[dict] = Field(
        None, description="Information about oldest database"
    )
    calculated_at: datetime = Field(..., description="Statistics calculation timestamp")
