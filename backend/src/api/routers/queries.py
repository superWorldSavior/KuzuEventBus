from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from loguru import logger
import time
from typing import Any, Dict
from uuid import UUID

from src.application.dtos.query_execution import (
    DirectQueryRequest as QueryRequest,
    DirectQueryResponse as QueryResponse,
)
from src.domain.shared.ports.query_execution import QueryExecutionService
from src.infrastructure.kuzu.kuzu_query_execution_adapter import (
    KuzuQueryExecutionAdapter,
)

router = APIRouter(prefix="/databases", tags=["queries"])

# Dependency factory (YAGNI - direct adapter instantiation for now)
async def get_query_execution_service() -> QueryExecutionService:
    # In future could select per-tenant engine instance or pool
    return KuzuQueryExecutionAdapter()


@router.post("/{database_id}/query", response_model=QueryResponse)
async def execute_query(
    database_id: UUID,
    request_model: QueryRequest,
    request: Request,
    service: QueryExecutionService = Depends(get_query_execution_service),
) -> QueryResponse:
    started = time.perf_counter()
    customer = getattr(request.state, "customer", None)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    tenant_id = str(customer.id.value)
    query_hash = request_model.query_hash()

    # Strategic pre-execution log
    logger.bind(
        event="query_execute_start",
        tenant_id=tenant_id,
        database_id=str(database_id),
        query_hash=query_hash,
        timeout_s=request_model.timeout_seconds,
    ).info("Query execution started")

    try:
        execution = await service.execute_query(
            tenant_id=UUID(tenant_id),
            database_id=database_id,
            cypher=request_model.query,
            parameters=request_model.parameters,
            timeout_seconds=request_model.timeout_seconds,
        )
        if isinstance(execution, dict) and execution.get("error"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Query execution failed: {execution['error']}",
            )
    except Exception as ex:  # noqa: BLE001
        duration_ms = (time.perf_counter() - started) * 1000
        logger.bind(
            event="query_execute_error",
            tenant_id=tenant_id,
            database_id=str(database_id),
            query_hash=query_hash,
            duration_ms=duration_ms,
            error=str(ex),
        ).error("Query execution failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Query execution failed: {ex}",
        ) from ex

    duration_ms = (time.perf_counter() - started) * 1000
    rows = execution.get("results", []) if isinstance(execution, dict) else []
    meta: Dict[str, Any] = {
        "raw_meta": execution.get("meta", {}) if isinstance(execution, dict) else {},
    }
    response = QueryResponse(
        results=rows,
        rows_returned=len(rows),
        execution_time_ms=duration_ms,
        meta=meta,
        query_hash=query_hash,
    )

    logger.bind(
        event="query_execute_success",
        tenant_id=tenant_id,
        database_id=str(database_id),
        query_hash=query_hash,
        duration_ms=duration_ms,
        rows=len(rows),
    ).info("Query execution succeeded")
    return response
