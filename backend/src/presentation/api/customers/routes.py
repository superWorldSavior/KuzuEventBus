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
from src.application.services.customer_account_service import CustomerAccountService
from src.infrastructure.dependencies import (
    customer_repository,
    cache_service,
    auth_service,
    notification_service,
)

router = APIRouter()

# Simple dependency injection - YAGNI approach
def get_customer_service() -> CustomerAccountService:
    return CustomerAccountService(
        account_repository=customer_repository(),
        auth_service=auth_service(),
        notification_service=notification_service(),
        cache_service=cache_service(),
    )


@router.post("/register", response_model=CustomerRegistrationResponse)
async def register_customer(
    request: CustomerRegistrationRequest,
    service: CustomerAccountService = Depends(get_customer_service),
) -> CustomerRegistrationResponse:
    """Register a new customer account."""
    try:
        # Call application service
        result = await service.register_customer(
            tenant_name=request.tenant_name,
            organization_name=request.organization_name,
            admin_email=request.admin_email,
            # subscription_plan removed for YAGNI simplicity
        )
        
        return CustomerRegistrationResponse(
            customer_id=result["customer_id"],
            tenant_name=result["tenant_name"],
            organization_name=result["organization_name"],
            admin_email=result["admin_email"],
            api_key=result["api_key"],
            subscription_status=result["subscription_status"],
            created_at=result["created_at"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{customer_id}/api-keys")
async def list_api_keys(
    customer_id: UUID,
    service: CustomerAccountService = Depends(get_customer_service),
):
    """List all API keys for a customer (MVP - no pagination)."""
    try:
        return await service.list_api_keys(customer_id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{customer_id}/api-keys/{api_key}")
async def revoke_api_key(
    customer_id: UUID,
    api_key: str = Path(..., description="The API key value to revoke"),
    service: CustomerAccountService = Depends(get_customer_service),
):
    """Revoke a specific API key for a customer."""
    try:
        success = await service.revoke_api_key(customer_id, api_key)
        if not success:
            raise HTTPException(status_code=404, detail="API key not found or already revoked")
        return {"revoked": True, "api_key": api_key}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))
