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
    query_catalog_repository,
)
from src.infrastructure.database.database_metadata_repository import PostgresDatabaseMetadataRepository
from src.application.usecases.submit_async_query import (
    SubmitAsyncQueryUseCase,
    SubmitAsyncQueryRequest,
)
from src.application.dtos.query_catalog import (
    PopularQueryItem,
    FavoriteQueryItem,
    AddFavoriteRequest,
    RemoveFavoriteResponse,
)
from src.domain.query_catalog.value_objects import QueryText, QueryHash
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/databases", tags=["queries"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])  # mounted at /api/v1/jobs


async def resolve_database_id(database_identifier: str, tenant_id: UUID) -> UUID:
    """Resolve database identifier (UUID or name) to UUID.
    
    Args:
        database_identifier: Either a UUID string or database name
        tenant_id: Tenant UUID for scoped name lookup
        
    Returns:
        UUID of the database
        
    Raises:
        HTTPException: 404 if database not found by name
    """
    try:
        return UUID(database_identifier)
    except ValueError:
        repo = PostgresDatabaseMetadataRepository()
        db_meta = await repo.find_by_name(tenant_id=tenant_id, name=database_identifier)
        if not db_meta:
            raise HTTPException(
                status_code=404,
                detail=f"Database '{database_identifier}' not found for this tenant"
            )
        return db_meta.id

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
    database_id: str,  # Accept UUID or database name
    request_model: QueryRequest,
    ctx: RequestContext = Depends(get_request_context),
) -> QuerySubmitResponse:
    # Resolve database identifier to UUID
    dbid = await resolve_database_id(database_id, ctx.tenant_id)
    
    logger.bind(
        event="query_submit",
        tenant_id=str(ctx.tenant_id),
        database_id=str(dbid),
        timeout_s=request_model.timeout_seconds,
    ).info("Submitting async query")
    usecase = SubmitAsyncQueryUseCase(
        queue=message_queue_service(),
        transactions=transaction_repository(),
        query_catalog=query_catalog_repository(),
    )
    req = SubmitAsyncQueryRequest(
        tenant_id=ctx.tenant_id,
        database_id=dbid,
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


@router.get(
    "/{database_id}/queries/popular",
    response_model=list[PopularQueryItem],
    summary="Lister les requêtes les plus utilisées (hors favoris)",
)
async def list_popular_queries(
    database_id: str,  # Accept UUID or database name
    limit: int = 10,
    ctx: RequestContext = Depends(get_request_context),
) -> list[PopularQueryItem]:
    # Resolve database identifier to UUID
    dbid = await resolve_database_id(database_id, ctx.tenant_id)
    
    repo = query_catalog_repository()
    items = await repo.list_most_used(
        tenant_id=ctx.tenant_id,
        database_id=dbid,
        limit=min(max(1, limit), 50),
    )
    return [
        PopularQueryItem(
            query_hash=i["query_hash"],
            query_text=i["query_text"],
            usage_count=int(i["usage_count"]),
            last_used_at=i["last_used_at"],
        )
        for i in items
    ]


@router.get(
    "/{database_id}/queries/favorites",
    response_model=list[FavoriteQueryItem],
    summary="Lister les requêtes favorites",
)
async def list_favorites(
    database_id: str,  # Accept UUID or database name
    ctx: RequestContext = Depends(get_request_context),
) -> list[FavoriteQueryItem]:
    # Resolve database identifier to UUID
    dbid = await resolve_database_id(database_id, ctx.tenant_id)
    
    repo = query_catalog_repository()
    items = await repo.list_favorites(
        tenant_id=ctx.tenant_id,
        database_id=dbid,
    )
    return [
        FavoriteQueryItem(
            query_hash=i["query_hash"],
            query_text=i["query_text"],
            created_at=i["created_at"],
        )
        for i in items
    ]


@router.post(
    "/{database_id}/queries/favorites",
    response_model=FavoriteQueryItem,
    summary="Ajouter une requête aux favoris (max 10)",
)
async def add_favorite(
    database_id: str,  # Accept UUID or database name
    body: AddFavoriteRequest,
    ctx: RequestContext = Depends(get_request_context),
) -> FavoriteQueryItem:
    # Resolve database identifier to UUID
    dbid = await resolve_database_id(database_id, ctx.tenant_id)
    repo = query_catalog_repository()
    try:
        qt = QueryText(body.query)
        qh = QueryHash.from_query_text(qt)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        await repo.add_favorite(
            tenant_id=ctx.tenant_id,
            database_id=dbid,
            query_text=qt.value,
            query_hash=qh.value,
        )
    except Exception as exc:  # noqa: BLE001
        # BusinessRuleViolation or others
        raise HTTPException(status_code=400, detail=str(exc))

    return FavoriteQueryItem(
        query_hash=qh.value,
        query_text=qt.value,
        created_at=datetime.now(timezone.utc),
    )


@router.delete(
    "/{database_id}/queries/favorites/{query_hash}",
    response_model=RemoveFavoriteResponse,
    summary="Supprimer une requête des favoris",
)
async def remove_favorite(
    database_id: str,  # Accept UUID or database name
    query_hash: str,
    ctx: RequestContext = Depends(get_request_context),
) -> RemoveFavoriteResponse:
    # Resolve database identifier to UUID
    dbid = await resolve_database_id(database_id, ctx.tenant_id)
    # Normalize + basic validation via VO
    try:
        qh = QueryHash(query_hash.strip().lower())
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc))

    repo = query_catalog_repository()
    removed = await repo.remove_favorite(
        tenant_id=ctx.tenant_id,
        database_id=dbid,
        query_hash=qh.value,
    )
    return RemoveFavoriteResponse(removed=removed)

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


@jobs_router.get(
    "/{transaction_id}/results",
    summary="Récupérer les résultats d'un job completed",
    description="Retourne les résultats (rows) d'une transaction terminée. Cache TTL: 1h.",
    responses={
        200: {"description": "Résultats du job"},
        404: {"description": "Job introuvable ou résultats expirés"},
        400: {"description": "Job pas encore terminé"},
    },
)
async def get_job_results(
    transaction_id: UUID,
    ctx: RequestContext = Depends(get_request_context),
):
    """Récupère les résultats d'un job completed depuis le cache Redis."""
    from src.application.usecases.get_query_results import (
        GetQueryResultsUseCase,
        GetQueryResultsRequest,
    )
    from src.infrastructure.dependencies import authorization_service, cache_service

    uc = GetQueryResultsUseCase(
        authz=authorization_service(),
        cache=cache_service(),
        transactions=transaction_repository(),
    )
    
    try:
        results = await uc.execute(
            GetQueryResultsRequest(tenant_id=ctx.tenant_id, transaction_id=transaction_id)
        )
        return results or {"results": []}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail="Results not found or expired")
