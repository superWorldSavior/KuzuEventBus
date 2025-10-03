"""Database management router.

Database provisioning and management endpoints with explicit resource creation.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
import base64

from src.infrastructure.logging.config import get_logger
from src.application.usecases.provision_tenant_resources import (
    ProvisionTenantResourcesUseCase,
    ProvisionTenantResourcesRequest,
)
from src.domain.shared.ports.database_management import (
    BucketProvisioningService,
    DatabaseProvisioningService,
    DatabaseMetadataRepository,
)
from src.infrastructure.database.minio_bucket_provisioning import MinioBucketProvisioningAdapter
from src.infrastructure.kuzu.kuzu_database_provisioning import KuzuDatabaseProvisioningAdapter
from src.infrastructure.database.database_metadata_repository import PostgresDatabaseMetadataRepository
from src.presentation.api.context.request_context import RequestContext, get_request_context
from src.infrastructure.dependencies import (
    authorization_service,
    kuzu_database_repository,
    kuzu_query_service,
    cache_service,
    file_storage_service,
    notification_service,
    snapshot_repository,
    lock_service,
)
from src.application.usecases.get_kuzu_database_info import (
    GetKuzuDatabaseInfoUseCase,
    GetKuzuDatabaseInfoRequest,
)
from src.application.usecases.delete_kuzu_database import (
    DeleteKuzuDatabaseUseCase,
    DeleteKuzuDatabaseRequest,
)
from src.application.usecases.upload_kuzu_database_file import (
    UploadKuzuDatabaseFileUseCase,
    UploadKuzuDatabaseFileRequest,
)
from src.application.usecases.create_database_snapshot import (
    CreateDatabaseSnapshotUseCase,
    CreateDatabaseSnapshotRequest,
)
from src.application.usecases.list_database_snapshots import (
    ListDatabaseSnapshotsUseCase,
    ListDatabaseSnapshotsRequest,
)
from src.application.usecases.restore_database_from_snapshot import (
    RestoreDatabaseFromSnapshotUseCase,
    RestoreDatabaseFromSnapshotRequest,
)
from src.application.usecases.restore_database_pitr import (
    RestoreDatabasePITRUseCase,
    RestoreDatabasePITRRequest,
)
from src.application.usecases.list_database_pitr import (
    ListDatabasePITRUseCase,
    ListDatabasePITRRequest,
)
from src.application.usecases.preview_database_pitr import (
    PreviewDatabasePITRUseCase,
    PreviewDatabasePITRRequest,
)
from pydantic import BaseModel

router = APIRouter()
db_logger = get_logger("database_operations")


async def resolve_database_id(database_identifier: str, tenant_id: UUID) -> UUID:
    """Resolve database identifier (UUID or name) to UUID.
    
    Accepts either a UUID string or a database name and returns the UUID.
    This makes the API more user-friendly by allowing natural database names.
    
    Args:
        database_identifier: Either a UUID string or database name
        tenant_id: Tenant UUID for scoped name lookup
        
    Returns:
        UUID of the database
        
    Raises:
        HTTPException: 404 if database not found by name
    """
    # Try parsing as UUID first (fast path)
    try:
        return UUID(database_identifier)
    except ValueError:
        # Not a UUID, lookup by name within tenant scope
        repo = PostgresDatabaseMetadataRepository()
        db_meta = await repo.find_by_name(tenant_id=tenant_id, name=database_identifier)
        if not db_meta:
            raise HTTPException(
                status_code=404,
                detail=f"Database '{database_identifier}' not found for this tenant"
            )
        return db_meta.id


def get_provisioning_use_case() -> ProvisionTenantResourcesUseCase:
    """Provide provisioning use case with configured dependencies."""
    bucket_service: BucketProvisioningService = MinioBucketProvisioningAdapter()
    db_service: DatabaseProvisioningService = KuzuDatabaseProvisioningAdapter()
    metadata_repo: DatabaseMetadataRepository = PostgresDatabaseMetadataRepository()
    
    # Create snapshot use case for initial snapshot
    snapshot_uc = CreateDatabaseSnapshotUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        storage=file_storage_service(),
        snapshots=snapshot_repository(),
        locks=lock_service(),
        cache=cache_service(),
    )
    
    return ProvisionTenantResourcesUseCase(
        bucket_service=bucket_service,
        database_service=db_service,
        metadata_repository=metadata_repo,
        snapshot_usecase=snapshot_uc,
    )


def get_create_snapshot_uc() -> CreateDatabaseSnapshotUseCase:
    return CreateDatabaseSnapshotUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        storage=file_storage_service(),
        snapshots=snapshot_repository(),
        locks=lock_service(),
        cache=cache_service(),
    )


def get_list_snapshots_uc() -> ListDatabaseSnapshotsUseCase:
    return ListDatabaseSnapshotsUseCase(
        authz=authorization_service(),
        snapshots=snapshot_repository(),
    )


def get_restore_uc() -> RestoreDatabaseFromSnapshotUseCase:
    return RestoreDatabaseFromSnapshotUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        snapshots=snapshot_repository(),
        storage=file_storage_service(),
        locks=lock_service(),
        cache=cache_service(),
    )


def get_pitr_restore_uc() -> RestoreDatabasePITRUseCase:
    return RestoreDatabasePITRUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        snapshots=snapshot_repository(),
        storage=file_storage_service(),
        locks=lock_service(),
        cache=cache_service(),
        kuzu=kuzu_query_service(),
    )


def get_list_pitr_uc() -> ListDatabasePITRUseCase:
    return ListDatabasePITRUseCase(
        authz=authorization_service(),
        snapshots=snapshot_repository(),
        storage=file_storage_service(),
    )


def get_preview_pitr_uc() -> PreviewDatabasePITRUseCase:
    return PreviewDatabasePITRUseCase(
        authz=authorization_service(),
        db_repo=kuzu_database_repository(),
        snapshots=snapshot_repository(),
        storage=file_storage_service(),
    )


# Bookmarks DI
def bookmark_repository():
    from src.infrastructure.database.bookmark_repository import PostgresBookmarkRepository

    return PostgresBookmarkRepository()


def get_db_info_uc() -> GetKuzuDatabaseInfoUseCase:
    return GetKuzuDatabaseInfoUseCase(
        authz_service=authorization_service(),
        database_repository=kuzu_database_repository(),
        query_service=kuzu_query_service(),
        cache_service=cache_service(),
    )


def get_delete_db_uc() -> DeleteKuzuDatabaseUseCase:
    return DeleteKuzuDatabaseUseCase(
        authz_service=authorization_service(),
        database_repository=kuzu_database_repository(),
        storage=file_storage_service(),
        cache_service=cache_service(),
        notification_service=notification_service(),
    )


def get_upload_db_uc() -> UploadKuzuDatabaseFileUseCase:
    return UploadKuzuDatabaseFileUseCase(
        authz_service=authorization_service(),
        database_repository=kuzu_database_repository(),
        storage=file_storage_service(),
        cache_service=cache_service(),
        notification_service=notification_service(),
    )


class ProvisionRequest(BaseModel):
    database_name: Optional[str] = Field("main", description="Database name (defaults to 'main')")


class ProvisionResponse(BaseModel):
    tenant_id: str
    bucket: str
    database_name: str
    database_id: str
    filesystem_path: str
    created_at: str


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


class UploadDatabaseRequest(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    file_content_base64: str = Field(..., description="Base64-encoded file content")


class UploadDatabaseResponse(BaseModel):
    file_path: str
    file_size: int
    uploaded_at: str
    upload_url: Optional[str] = None


class SnapshotResponse(BaseModel):
    id: str
    object_key: str
    checksum: str
    size_bytes: int
    created_at: str


class SnapshotListResponse(BaseModel):
    database_id: str
    snapshots: List[SnapshotResponse]
    count: int


class RestoreRequest(BaseModel):
    snapshot_id: str = Field(..., description="Snapshot identifier (UUID)")


class RestoreResponse(BaseModel):
    restored: bool
    database_id: str
    mode: str
    restored_at: str


@router.post(
    "/provision/{tenant_id}",
    response_model=ProvisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provisionner les ressources d'un tenant (bucket + base)",
    description=(
        "Crée (si nécessaire) le bucket/prefix de stockage MinIO du tenant et provisionne une base Kuzu vide.\n\n"
        "Idempotent côté bucket; renvoie les métadonnées de la base créée."
    ),
    responses={
        201: {"description": "Ressources provisionnées"},
        400: {"description": "Requête invalide / Erreur de provisioning"},
        401: {"description": "Non autorisé"},
    },
)
async def provision_tenant_database(
    _request: Request,
    tenant_id: UUID,
    provision_request: ProvisionRequest,
    use_case: ProvisionTenantResourcesUseCase = Depends(get_provisioning_use_case),
) -> ProvisionResponse:
    """Provision bucket and default database for tenant."""
    db_logger.info("Database provisioning requested", tenant_id=str(tenant_id), database_name=provision_request.database_name)
    try:
        request_obj = ProvisionTenantResourcesRequest(
            tenant_id=tenant_id,
            database_name=provision_request.database_name,
        )
        response = await use_case.execute(request_obj)
        return ProvisionResponse(
            tenant_id=str(response.tenant_id),
            bucket=response.bucket,
            database_name=response.database_name,
            database_id=str(response.database_id),
            filesystem_path=response.filesystem_path,
            created_at=response.created_at,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


# --- PITR Bookmarks ---
class BookmarkPayload(BaseModel):
    name: str
    timestamp: str  # ISO 8601


@router.get(
    "/{database_id}/pitr/bookmarks",
    summary="Lister les bookmarks PITR",
)
async def list_pitr_bookmarks(
    database_id: str,
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        repo = bookmark_repository()
        items = await repo.list_by_database(ctx.tenant_id, dbid)
        return {"database_id": database_id, "bookmarks": items}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/{database_id}/pitr/bookmarks",
    summary="Créer ou mettre à jour un bookmark PITR",
)
async def create_pitr_bookmark(
    database_id: str,
    payload: BookmarkPayload,
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        repo = bookmark_repository()
        _ = await repo.add(
            tenant_id=ctx.tenant_id,
            database_id=dbid,
            name=payload.name,
            timestamp=payload.timestamp,
        )
        return {"ok": True}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete(
    "/{database_id}/pitr/bookmarks/{name}",
    summary="Supprimer un bookmark PITR",
)
async def delete_pitr_bookmark(
    database_id: str,
    name: str,
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        repo = bookmark_repository()
        ok = await repo.delete(ctx.tenant_id, dbid, name)
        return {"deleted": ok}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get(
    "/{database_id}/pitr",
    summary="Lister la timeline PITR et/ou calculer un plan de restauration",
    description=(
        "Retourne la timeline (snapshots + WAL) sur une période donnée.\n\n"
        "Si 'target' est fourni (ISO 8601), renvoie également le plan de restauration (snapshot choisi + WAL à rejouer)."
    ),
    responses={
        200: {"description": "Timeline/plan retournés"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
    },
)
async def get_database_pitr(
    database_id: str,
    start: str | None = None,
    end: str | None = None,
    target: str | None = None,
    window: str | None = None,
    include_queries: bool = False,
    include_types: bool = False,
    ctx: RequestContext = Depends(get_request_context),
    uc: ListDatabasePITRUseCase = Depends(get_list_pitr_uc),
) -> dict:
    """Lister la timeline PITR et optionnellement calculer le plan pour 'target'."""
    try:
        from datetime import datetime

        # Accept UUID or database name


        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00")) if start else None
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")) if end else None
        target_dt = datetime.fromisoformat(target.replace("Z", "+00:00")) if target else None

        req = ListDatabasePITRRequest(
            tenant_id=ctx.tenant_id,
            database_id=dbid,
            start=start_dt,
            end=end_dt,
            target_timestamp=target_dt,
            window=window,
            include_queries=include_queries,
            include_types=include_types,
        )
        res = await uc.execute(req)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {e}") from e
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/{database_id}/snapshots",
    response_model=SnapshotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un snapshot de la base",
    description=(
        "Capture un instantané de la base Kuzu.\n\n"
        "- Si le chemin de la base est un répertoire, tout le dossier est archivé en tar.gz (incluant fichiers .wal).\n"
        "- Si c'est un fichier unique (.kuzu), le fichier est sauvegardé tel quel.\n"
        "- Stockage sur MinIO, checksum SHA256 et métadonnées persistées."
    ),
    responses={
        201: {"description": "Snapshot créé"},
        400: {"description": "Requête invalide / Erreur I/O / MinIO"},
        401: {"description": "Non autorisé"},
    },
)
async def create_database_snapshot(
    database_id: str,
    ctx: RequestContext = Depends(get_request_context),
    uc: CreateDatabaseSnapshotUseCase = Depends(get_create_snapshot_uc),
) -> SnapshotResponse:
    db_logger.info("Create snapshot requested", database_id=database_id, tenant_id=str(ctx.tenant_id))
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        res = await uc.execute(CreateDatabaseSnapshotRequest(tenant_id=ctx.tenant_id, database_id=dbid))
        return SnapshotResponse(
            id=str(res.snapshot_id),
            object_key=res.object_key,
            checksum=res.checksum,
            size_bytes=res.size_bytes,
            created_at=res.created_at,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get(
    "/{database_id}/snapshots",
    response_model=SnapshotListResponse,
    summary="Lister les snapshots d'une base",
    description="Retourne la liste des snapshots pour la base (triés du plus récent au plus ancien).",
    responses={
        200: {"description": "Liste des snapshots"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
    },
)
async def list_database_snapshots(
    database_id: str,
    ctx: RequestContext = Depends(get_request_context),
    uc: ListDatabaseSnapshotsUseCase = Depends(get_list_snapshots_uc),
) -> SnapshotListResponse:
    db_logger.info("List snapshots requested", database_id=database_id, tenant_id=str(ctx.tenant_id))
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        items = await uc.execute(ListDatabaseSnapshotsRequest(tenant_id=ctx.tenant_id, database_id=dbid))
        snapshots = [
            SnapshotResponse(
                id=str(it.get("id")),
                object_key=str(it.get("object_key")),
                checksum=str(it.get("checksum")),
                size_bytes=int(it.get("size_bytes", 0)),
                created_at=str(it.get("created_at") or ""),
            )
            for it in items
        ]
        return SnapshotListResponse(database_id=database_id, snapshots=snapshots, count=len(snapshots))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/{database_id}/restore",
    response_model=RestoreResponse,
    summary="Restaurer une base depuis un snapshot (overwrite)",
    description=(
        "Restaure le snapshot spécifié par-dessus la base courante.\n\n"
        "- Verrou distribué pendant l'opération.\n"
        "- Swap atomique (fichier/répertoire) pour éviter toute incohérence.\n"
        "- Invalidation du cache de métadonnées."
    ),
    responses={
        200: {"description": "Restauration réussie"},
        400: {"description": "Requête invalide / Snapshot introuvable / Erreur I/O"},
        401: {"description": "Non autorisé"},
    },
)
async def restore_database_from_snapshot(
    database_id: str,
    payload: RestoreRequest,
    ctx: RequestContext = Depends(get_request_context),
    uc: RestoreDatabaseFromSnapshotUseCase = Depends(get_restore_uc),
) -> RestoreResponse:
    db_logger.info(
        "Restore snapshot requested",
        database_id=database_id,
        tenant_id=str(ctx.tenant_id),
        snapshot_id=payload.snapshot_id,
    )
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        res = await uc.execute(
            RestoreDatabaseFromSnapshotRequest(
                tenant_id=ctx.tenant_id,
                database_id=dbid,
                snapshot_id=UUID(payload.snapshot_id),
            )
        )
        return RestoreResponse(
            restored=res.restored,
            database_id=str(res.database_id),
            mode=res.mode,
            restored_at=res.restored_at,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/{database_id}/upload",
    response_model=UploadDatabaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Uploader un fichier lié à la base",
    description=(
        "Charge un fichier (contenu base64) vers le stockage du tenant pour la base donnée.\n"
        "Retourne le chemin logique, la taille et la date d'upload."
    ),
    responses={
        201: {"description": "Fichier uploadé"},
        400: {"description": "Base64 invalide / Requête invalide"},
        401: {"description": "Non autorisé"},
    },
)
async def upload_database_file(
    database_id: str,
    payload: UploadDatabaseRequest,
    ctx: RequestContext = Depends(get_request_context),
    uc: UploadKuzuDatabaseFileUseCase = Depends(get_upload_db_uc),
) -> UploadDatabaseResponse:
    db_logger.info(
        "Database file upload requested",
        database_id=database_id,
        tenant_id=str(ctx.tenant_id),
        file_name=payload.file_name,
    )
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        try:
            content_bytes = base64.b64decode(payload.file_content_base64)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Invalid base64 content") from e

        res = await uc.execute(
            UploadKuzuDatabaseFileRequest(
                tenant_id=ctx.tenant_id,
                database_id=dbid,
                file_content=content_bytes,
                file_name=payload.file_name,
            )
        )
        return UploadDatabaseResponse(
            file_path=res.file_path,
            file_size=res.file_size,
            uploaded_at=res.uploaded_at,
            upload_url=res.upload_url,
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e





@router.get(
    "/",
    response_model=DatabaseListResponse,
    summary="Lister les bases du tenant",
    description="Retourne les bases du tenant courant avec quelques métadonnées (taille inconnue en MVP).",
    responses={
        200: {"description": "Liste des bases"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
    },
)
async def list_databases(
    ctx: RequestContext = Depends(get_request_context),
) -> DatabaseListResponse:
    db_logger.info("Database listing requested", tenant_id=str(ctx.tenant_id))
    try:
        repo = PostgresDatabaseMetadataRepository()
        metas = await repo.find_by_tenant(ctx.tenant_id)
        items: List[DatabaseResponse] = []
        total_size = 0
        for m in metas:
            # size is unknown here (not tracked yet) -> 0 for MVP
            items.append(
                DatabaseResponse(
                    id=str(m.id),
                    name=m.name.value,
                    description=None,
                    status="ready",
                    created_at=m.created_at.isoformat(),
                    size_bytes=0,
                    tenant_id=str(m.tenant_id),
                )
            )
        return DatabaseListResponse(
            tenant=str(ctx.tenant_id),
            databases=items,
            total_count=len(items),
            total_size_bytes=total_size,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/",
    response_model=DatabaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une nouvelle base pour le tenant",
    description=(
        "Provisionne une base Kuzu vide pour le tenant courant, en créant le stockage si nécessaire."
    ),
    responses={
        201: {"description": "Base créée"},
        400: {"description": "Requête invalide / Conflit de nom / Erreur de provisioning"},
        401: {"description": "Non autorisé"},
    },
)
async def create_database(
    create_request: CreateDatabaseRequest,
    ctx: RequestContext = Depends(get_request_context),
    use_case: ProvisionTenantResourcesUseCase = Depends(get_provisioning_use_case),
) -> DatabaseResponse:
    db_logger.info("Database creation requested", tenant_id=str(ctx.tenant_id), name=create_request.name)
    try:
        # Validate: ensure database name is unique within tenant
        repo = PostgresDatabaseMetadataRepository()
        existing = await repo.find_by_name(tenant_id=ctx.tenant_id, name=create_request.name)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Database '{create_request.name}' already exists for this tenant"
            )
        
        req = ProvisionTenantResourcesRequest(tenant_id=ctx.tenant_id, database_name=create_request.name)
        res = await use_case.execute(req)
        return DatabaseResponse(
            id=str(res.database_id),
            name=res.database_name,
            description=create_request.description,
            status="ready",
            created_at=res.created_at,
            size_bytes=0,
            tenant_id=str(res.tenant_id),
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get(
    "/{database_id}",
    response_model=DatabaseResponse,
    summary="Obtenir les métadonnées d'une base",
    description=(
        "Retourne les métadonnées connues pour la base (nom, dates, taille approximative)."
    ),
    responses={
        200: {"description": "Métadonnées de la base"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
        404: {"description": "Base introuvable"},
    },
)
async def get_database(
    _request: Request,
    database_id: str,
    ctx: RequestContext = Depends(get_request_context),
    uc: GetKuzuDatabaseInfoUseCase = Depends(get_db_info_uc),
) -> DatabaseResponse:
    db_logger.info("Database lookup requested", database_id=database_id, tenant_id=str(ctx.tenant_id))
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        info = await uc.execute(GetKuzuDatabaseInfoRequest(tenant_id=ctx.tenant_id, database_id=dbid))
        if not info:
            raise HTTPException(status_code=404, detail="Database not found")
        return DatabaseResponse(
            id=database_id,
            name=str(info.get("name", "")),
            description=None,
            status="ready",
            created_at=str(info.get("created_at") or ""),
            size_bytes=int(info.get("size_bytes", 0)),
            tenant_id=str(ctx.tenant_id),
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete(
    "/{database_id}",
    summary="Supprimer une base",
    description="Supprime la métadonnée et les fichiers associés si applicable, puis invalide le cache.",
    responses={
        200: {"description": "Base supprimée"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
        404: {"description": "Base introuvable"},
    },
)
async def delete_database(
    _request: Request,
    database_id: str,
    ctx: RequestContext = Depends(get_request_context),
    uc: DeleteKuzuDatabaseUseCase = Depends(get_delete_db_uc),
) -> dict:
    db_logger.info("Database deletion requested", database_id=database_id, tenant_id=str(ctx.tenant_id))
    try:
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        ok = await uc.execute(DeleteKuzuDatabaseRequest(tenant_id=ctx.tenant_id, database_id=dbid))
        if not ok:
            raise HTTPException(status_code=404, detail="Database not found")
        return {"deleted": True, "database_id": database_id}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get(
    "/{database_id}/pitr/preview",
    summary="Prévisualiser l'état de la base à un timestamp (PITR non-destructif)",
    description=(
        "Prévisualise l'état de la base au timestamp spécifié SANS modifier la base principale.\n\n"
        "- Restaure dans un espace temporaire\n"
        "- Exécute une query de lecture pour voir l'état (défaut: MATCH (n) RETURN n LIMIT 100)\n"
        "- Retourne les résultats sans toucher à la base principale"
    ),
    responses={
        200: {"description": "Preview réussie"},
        400: {"description": "Timestamp invalide / Aucun snapshot disponible"},
        401: {"description": "Non autorisé"},
        404: {"description": "Base introuvable"},
    },
)
async def preview_database_pitr(
    database_id: str,
    target_timestamp: str,  # ISO 8601 format
    preview_query: str | None = None,
    ctx: RequestContext = Depends(get_request_context),
    uc: PreviewDatabasePITRUseCase = Depends(get_preview_pitr_uc),
) -> dict:
    """Preview database state at a specific point in time."""
    db_logger.info(
        "PITR preview requested",
        database_id=database_id,
        tenant_id=str(ctx.tenant_id),
        target_timestamp=target_timestamp,
    )
    
    try:
        from datetime import datetime
        # Accept UUID or database name

        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        target_dt = datetime.fromisoformat(target_timestamp.replace("Z", "+00:00"))
        
        res = await uc.execute(
            PreviewDatabasePITRRequest(
                tenant_id=ctx.tenant_id,
                database_id=dbid,
                target_timestamp=target_dt,
                preview_query=preview_query,
            )
        )
        
        return {
            "database_id": str(res.database_id),
            "target_timestamp": res.target_timestamp,
            "snapshot_used": res.snapshot_used,
            "wal_files_replayed": res.wal_files_replayed,
            "preview_query": res.preview_query,
            "results": res.results,
            "rows_returned": res.rows_returned,
            "previewed_at": res.previewed_at,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {e}") from e
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/{database_id}/restore-pitr",
    summary="Restaurer la base à un timestamp précis (PITR)",
    description=(
        "Point-In-Time Recovery: restaure la base au timestamp spécifié.\n\n"
        "- Trouve le snapshot le plus proche avant le timestamp\n"
        "- Rejoue les WAL files jusqu'au timestamp cible\n"
        "- Opération atomique avec verrou distribué"
    ),
    responses={
        200: {"description": "Restauration PITR réussie"},
        400: {"description": "Timestamp invalide / Aucun snapshot disponible"},
        401: {"description": "Non autorisé"},
        404: {"description": "Base introuvable"},
    },
)
async def restore_database_pitr(
    database_id: str,
    target_timestamp: str,  # ISO 8601 format: "2025-01-01T14:30:00Z"
    ctx: RequestContext = Depends(get_request_context),
    uc: RestoreDatabasePITRUseCase = Depends(get_pitr_restore_uc),
) -> dict:
    """Restore database to specific point in time."""
    db_logger.info(
        "PITR restore requested",
        database_id=database_id,
        tenant_id=str(ctx.tenant_id),
        target_timestamp=target_timestamp,
    )
    try:
        from datetime import datetime, timezone
        
        # Accept UUID or database name

        
        dbid = await resolve_database_id(database_id, ctx.tenant_id)
        target_dt = datetime.fromisoformat(target_timestamp.replace("Z", "+00:00"))
        
        res = await uc.execute(
            RestoreDatabasePITRRequest(
                tenant_id=ctx.tenant_id,
                database_id=dbid,
                target_timestamp=target_dt,
            )
        )
        
        return {
            "restored": res.restored,
            "database_id": str(res.database_id),
            "target_timestamp": res.target_timestamp,
            "snapshot_used": res.snapshot_used,
            "wal_files_replayed": res.wal_files_replayed,
            "restored_at": res.restored_at,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {e}") from e
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e
