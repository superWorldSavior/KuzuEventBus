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
from src.infrastructure.dependencies import customer_repository, cache_service
from src.infrastructure.testing.testing_auth_service import TestingAuthService
from src.infrastructure.testing.testing_notification_service import (
    TestingNotificationService,
)

router = APIRouter()

# Simple dependency injection - YAGNI approach
def get_customer_service() -> CustomerAccountService:
    """Get customer account service.

    Uses real repository/cache via dependencies, and testing adapters for
    auth/notifications until production versions are implemented.
    """
    return CustomerAccountService(
        account_repository=customer_repository(),
        auth_service=TestingAuthService(),
        notification_service=TestingNotificationService(),
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
