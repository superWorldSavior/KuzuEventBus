"""
Customer management endpoints.
YAGNI implementation - minimal customer registration only.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path

from src.application.dtos.customer_account import (
    CustomerRegistrationRequest,
    CustomerRegistrationResponse,
)
from src.infrastructure.dependencies import (
    customer_repository,
    cache_service,
    auth_service,
    event_service,
)
from src.application.usecases.register_customer import (
    RegisterCustomerUseCase,
    RegisterCustomerRequest,
)
from src.application.usecases.list_customer_api_keys import (
    ListCustomerApiKeysUseCase,
    ListCustomerApiKeysRequest,
)
from src.application.usecases.revoke_customer_api_key import (
    RevokeCustomerApiKeyUseCase,
    RevokeCustomerApiKeyRequest,
)
from src.application.usecases.get_customer_details import (
    GetCustomerDetailsUseCase,
    GetCustomerDetailsRequest,
)

router = APIRouter()

# Simple dependency injection - YAGNI approach for use cases
def get_register_uc() -> RegisterCustomerUseCase:
    return RegisterCustomerUseCase(
        account_repository=customer_repository(),
        auth_service=auth_service(),
        event_service=event_service(),
        cache_service=cache_service(),
    )


def get_list_keys_uc() -> ListCustomerApiKeysUseCase:
    return ListCustomerApiKeysUseCase(
        account_repository=customer_repository(),
        auth_service=auth_service(),
    )


def get_revoke_key_uc() -> RevokeCustomerApiKeyUseCase:
    return RevokeCustomerApiKeyUseCase(
        account_repository=customer_repository(),
        auth_service=auth_service(),
    )


def get_details_uc() -> GetCustomerDetailsUseCase:
    return GetCustomerDetailsUseCase(
        account_repository=customer_repository(),
        cache_service=cache_service(),
    )


# NOTE: Register endpoint moved to /api/v1/auth/register for better organization


@router.get(
    "/{customer_id}",
    summary="Obtenir les détails d'un client",
    description=(
        "Retourne les informations essentielles du compte client pour valider la session côté frontend."
    ),
    responses={
        200: {"description": "Détails du client"},
        404: {"description": "Client introuvable"},
    },
)
async def get_customer_details(
    customer_id: UUID,
    uc: GetCustomerDetailsUseCase = Depends(get_details_uc),
):
    """Get minimal customer details for session validation."""
    try:
        details = await uc.execute(GetCustomerDetailsRequest(customer_id=customer_id))
        if not details:
            raise HTTPException(status_code=404, detail="Customer not found")
        return details
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/{customer_id}/api-keys",
    summary="Lister les API keys d'un client",
    description="Retourne les clés API actives/émises pour le client (MVP sans pagination).",
    responses={
        200: {"description": "Liste des API keys"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
    },
)
async def list_api_keys(
    customer_id: UUID,
    uc: ListCustomerApiKeysUseCase = Depends(get_list_keys_uc),
):
    """List all API keys for a customer (MVP - no pagination)."""
    try:
        return await uc.execute(ListCustomerApiKeysRequest(customer_id=customer_id))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/{customer_id}/api-keys/{api_key}",
    summary="Révoquer une API key",
    description="Révoque une clé API spécifique appartenant au client.",
    responses={
        200: {"description": "API key révoquée"},
        400: {"description": "Requête invalide"},
        401: {"description": "Non autorisé"},
        404: {"description": "Clé introuvable ou déjà révoquée"},
    },
)
async def revoke_api_key(
    customer_id: UUID,
    api_key: str = Path(..., description="The API key value to revoke"),
    uc: RevokeCustomerApiKeyUseCase = Depends(get_revoke_key_uc),
):
    """Revoke a specific API key for a customer."""
    try:
        success = await uc.execute(
            RevokeCustomerApiKeyRequest(customer_id=customer_id, api_key=api_key)
        )
        if not success:
            raise HTTPException(status_code=404, detail="API key not found or already revoked")
        return {"revoked": True, "api_key": api_key}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))
