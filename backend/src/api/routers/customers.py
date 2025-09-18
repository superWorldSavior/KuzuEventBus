"""
Customer management endpoints.
YAGNI implementation - minimal customer registration only.
"""
from fastapi import APIRouter, Depends, HTTPException

from src.application.dtos.customer_account import (
    CustomerRegistrationRequest,
    CustomerRegistrationResponse,
)
from src.application.services.customer_account_service import CustomerAccountService
from src.infrastructure.memory.cache_service import InMemoryCacheService
from src.infrastructure.memory.notification_service import InMemoryNotificationService
from src.infrastructure.memory.tenant_repository import InMemoryTenantRepository

router = APIRouter()

# Simple dependency injection - YAGNI approach
def get_customer_service() -> CustomerAccountService:
    """Get customer account service with in-memory dependencies."""
    from src.infrastructure.memory.auth_service import SimpleAuthService
    
    return CustomerAccountService(
        account_repository=InMemoryTenantRepository(),
        auth_service=SimpleAuthService(),
        notification_service=InMemoryNotificationService(),
        cache_service=InMemoryCacheService(),
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