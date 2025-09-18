"""
Query Execution DTOs for API requests and responses.

Pydantic models for Cypher query execution, transaction management, and results.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class QuerySubmitRequest(BaseModel):
    """Request model for query submission."""

    database_id: UUID = Field(..., description="Target database ID")
    query: str = Field(
        ..., min_length=1, max_length=10000, description="Cypher query to execute"
    )
    parameters: Optional[Dict[str, Any]] = Field(None, description="Query parameters")
    timeout_seconds: int = Field(
        300, ge=1, le=3600, description="Query timeout in seconds (1-3600)"
    )
    priority: int = Field(
        0, ge=0, le=10, description="Query priority (0=normal, 10=highest)"
    )

    @field_validator("query")
    @classmethod
    def validate_query(cls, v):
        """Basic query validation."""
        v = v.strip()

        # Check for potentially dangerous operations
        dangerous_keywords = ["DROP", "DELETE", "REMOVE", "DETACH"]
        query_upper = v.upper()

        for keyword in dangerous_keywords:
            if keyword in query_upper:
                # Allow in specific contexts (this is basic - real validation
                # would be more sophisticated)
                safe_contexts = ["WHERE", "MATCH", "WITH", "RETURN"]
                if not any(
                    safe_context in query_upper for safe_context in safe_contexts
                ):
                    raise ValueError(
                        f"Query contains potentially destructive operation: {keyword}"
                    )

        return v

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, v):
        """Validate query parameters."""
        if v is None:
            return v

        # Limit parameter depth and size to prevent abuse
        if len(str(v)) > 1000:
            raise ValueError("Parameters too large (max 1000 characters)")

        return v


class QuerySubmitResponse(BaseModel):
    """Response model for query submission."""

    transaction_id: UUID = Field(..., description="Unique transaction identifier")
    status: str = Field(..., description="Transaction status")
    submitted_at: datetime = Field(..., description="Submission timestamp")
    estimated_completion: datetime = Field(..., description="Estimated completion time")


class QueryStatusResponse(BaseModel):
    """Response model for query status."""

    transaction_id: UUID = Field(..., description="Transaction identifier")
    database_id: UUID = Field(..., description="Target database ID")
    status: str = Field(..., description="Current status")
    query: str = Field(..., description="Original query")
    submitted_at: datetime = Field(..., description="Submission timestamp")
    started_at: Optional[datetime] = Field(
        None, description="Execution start timestamp"
    )
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    execution_time_ms: Optional[int] = Field(
        None, description="Execution time in milliseconds"
    )
    result_count: Optional[int] = Field(None, description="Number of results")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class QueryResultsResponse(BaseModel):
    """Response model for query results."""

    transaction_id: UUID = Field(..., description="Transaction identifier")
    status: str = Field(..., description="Query status")
    results: List[Dict[str, Any]] = Field(..., description="Query results")
    metadata: Dict[str, Any] = Field(..., description="Result metadata")
    execution_stats: Dict[str, Any] = Field(..., description="Execution statistics")
    retrieved_at: datetime = Field(..., description="Results retrieval timestamp")


class TransactionListResponse(BaseModel):
    """Response model for transaction listing."""

    transaction_id: UUID = Field(..., description="Transaction identifier")
    database_id: UUID = Field(..., description="Target database ID")
    database_name: str = Field(..., description="Database name")
    status: str = Field(..., description="Transaction status")
    query_preview: str = Field(..., description="First 100 chars of query")
    submitted_at: datetime = Field(..., description="Submission timestamp")
    execution_time_ms: Optional[int] = Field(
        None, description="Execution time in milliseconds"
    )
    result_count: Optional[int] = Field(None, description="Number of results")


class QueryStatisticsResponse(BaseModel):
    """Response model for query execution statistics."""

    total_queries: int = Field(..., description="Total number of queries")
    completed: int = Field(..., description="Successfully completed queries")
    failed: int = Field(..., description="Failed queries")
    pending: int = Field(..., description="Pending queries")
    running: int = Field(..., description="Currently running queries")
    success_rate: float = Field(..., description="Success rate percentage")
    average_execution_time_seconds: float = Field(
        ..., description="Average execution time"
    )
    calculated_at: datetime = Field(..., description="Statistics calculation timestamp")


class QueryCancelRequest(BaseModel):
    """Request model for query cancellation."""

    reason: Optional[str] = Field(
        None, max_length=200, description="Optional reason for cancellation"
    )


class QueryValidationRequest(BaseModel):
    """Request model for query validation."""

    query: str = Field(
        ..., min_length=1, max_length=10000, description="Cypher query to validate"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        None, description="Query parameters for validation"
    )


class QueryValidationResponse(BaseModel):
    """Response model for query validation."""

    valid: bool = Field(..., description="Whether query is valid")
    error_message: Optional[str] = Field(None, description="Validation error message")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    estimated_complexity: Optional[str] = Field(
        None, description="Query complexity estimate"
    )
    suggested_timeout: Optional[int] = Field(
        None, description="Suggested timeout in seconds"
    )


class RealTimeUpdateEvent(BaseModel):
    """Model for real-time SSE events."""

    event_type: str = Field(..., description="Type of event")
    transaction_id: UUID = Field(..., description="Transaction identifier")
    data: Dict[str, Any] = Field(..., description="Event data")
    timestamp: datetime = Field(..., description="Event timestamp")


class NotificationMessage(BaseModel):
    """Model for notification messages."""

    notification_id: UUID = Field(..., description="Notification identifier")
    type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    created_at: datetime = Field(..., description="Creation timestamp")
    read: bool = Field(False, description="Whether notification has been read")
