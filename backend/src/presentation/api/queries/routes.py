from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from uuid import UUID

from src.application.dtos.query_execution import (
    DirectQueryRequest as QueryRequest,
    QuerySubmitResponse,
    QueryStatusResponse,
)
from src.presentation.api.context.request_context import (
    RequestContext,
    get_request_context,
)
from src.infrastructure.dependencies import (
    message_queue_service,
    transaction_repository,
)
from src.application.usecases.submit_async_query import (
    SubmitAsyncQueryUseCase,
    SubmitAsyncQueryRequest,
)
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/databases", tags=["queries"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])  # mounted at /api/v1/jobs

# Route unique: on envoie dans la queue et on répond 202 avec transaction_id
@router.post(
    "/{database_id}/query",
    response_model=QuerySubmitResponse,
    status_code=202,
    summary="Soumettre une requête asynchrone (job)",
    description=(
        "Soumet une requête Cypher pour exécution asynchrone. La requête est mise en file (Redis Streams)\n"
        "et un identifiant de transaction est retourné immédiatement (HTTP 202)."
    ),
    responses={
        202: {"description": "Requête acceptée, job créé"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
    },
)
async def execute_query(
    database_id: UUID,
    request_model: QueryRequest,
    ctx: RequestContext = Depends(get_request_context),
) -> QuerySubmitResponse:
    logger.bind(
        event="query_submit",
        tenant_id=str(ctx.tenant_id),
        database_id=str(database_id),
        timeout_s=request_model.timeout_seconds,
    ).info("Submitting async query")
    usecase = SubmitAsyncQueryUseCase(
        queue=message_queue_service(),
        transactions=transaction_repository(),
    )
    req = SubmitAsyncQueryRequest(
        tenant_id=ctx.tenant_id,
        database_id=database_id,
        query=request_model.query,
        parameters=request_model.parameters,
        timeout_seconds=request_model.timeout_seconds,
        priority=0,
    )
    res = await usecase.execute(req)
    now = datetime.now(tz=timezone.utc)
    return QuerySubmitResponse(
        transaction_id=res.transaction_id,
        status="pending",
        submitted_at=now,
        estimated_completion=now + timedelta(seconds=request_model.timeout_seconds),
    )


@jobs_router.get(
    "/{transaction_id}",
    response_model=QueryStatusResponse,
    summary="Obtenir le statut d'un job",
    description="Retourne l'état courant d'une transaction soumise (pending/running/completed/failed).",
    responses={
        200: {"description": "Statut du job"},
        404: {"description": "Job introuvable"},
    },
)
async def get_job_status(transaction_id: UUID):
    repo = transaction_repository()
    data = await repo.find_by_id(transaction_id)
    if not data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # Build response – pydantic can parse ISO strings into datetime fields
    return QueryStatusResponse(
        transaction_id=UUID(data["transaction_id"]),
        database_id=UUID(data["database_id"]),
        status=data.get("status", "unknown"),
        query=data.get("query", ""),
        submitted_at=data.get("created_at"),
        started_at=data.get("started_at"),
        completed_at=data.get("completed_at"),
        execution_time_ms=None,
        result_count=int(data.get("result_count", "0")),
        error_message=data.get("error_message") or None,
    )
