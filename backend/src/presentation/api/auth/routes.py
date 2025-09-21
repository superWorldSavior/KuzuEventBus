from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from src.presentation.api.context.request_context import (
    RequestContext,
    get_request_context,
)
from src.infrastructure.auth.jwt_service import jwt_service
from src.infrastructure.dependencies import customer_repository, auth_service, cache_service, notification_service
from src.application.usecases.register_customer import (
    RegisterCustomerUseCase,
    RegisterCustomerRequest,
)
from src.application.dtos.customer_account import (
    CustomerRegistrationRequest,
    CustomerRegistrationResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])  # mounted under /api/v1


class LoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")


class LoginResponse(BaseModel):
    """Response model for user login."""
    customer_id: str = Field(..., description="Customer ID")
    tenant_name: str = Field(..., description="Tenant name")
    organization_name: str = Field(..., description="Organization name")
    admin_email: str = Field(..., description="Admin email")
    api_key: str = Field(..., description="API key for subsequent requests")


class SseTokenResponse(BaseModel):
    token: str
    expires_in: int


@router.post("/sse-token", response_model=SseTokenResponse, summary="Mint a short-lived JWT for SSE access")
async def issue_sse_token(ctx: RequestContext = Depends(get_request_context)) -> SseTokenResponse:
    """Issue a short-lived JWT limited in scope to SSE consumption.

    Requires the request to be authenticated via API key, so the RequestContext is available.
    """
    svc = jwt_service()
    token = svc.issue_sse_token(
        tenant_id=str(ctx.tenant_id),
        tenant_name=ctx.tenant_name,
        customer_id=str(ctx.tenant_id),  # reuse tenant_id as subject for now
    )
    # We don't compute exp here again; client can treat TTL as configured default
    return SseTokenResponse(token=token, expires_in=300)


# Simple dependency injection for register use case
def get_register_uc() -> RegisterCustomerUseCase:
    return RegisterCustomerUseCase(
        account_repository=customer_repository(),
        auth_service=auth_service(),
        notification_service=notification_service(),
        cache_service=cache_service(),
    )


@router.post(
    "/register",
    response_model=CustomerRegistrationResponse,
    summary="Enregistrer un client et obtenir une API key",
    description=(
        "Crée un compte client (tenant + organisation) et retourne une clé API initiale.\n\n"
        "Cet endpoint est public (pas d'auth requise)."
    ),
    responses={
        200: {"description": "Client enregistré, API key émise"},
        400: {"description": "Requête invalide"},
    },
)
async def register_customer(
    request: CustomerRegistrationRequest,
    uc: RegisterCustomerUseCase = Depends(get_register_uc),
) -> CustomerRegistrationResponse:
    """Register a new customer account."""
    try:
        # Execute use case
        result = await uc.execute(
            RegisterCustomerRequest(
                tenant_name=request.tenant_name,
                organization_name=request.organization_name,
                admin_email=request.admin_email,
                password=request.password,
            )
        )

        return CustomerRegistrationResponse(
            customer_id=str(result.customer_id),
            tenant_name=result.tenant_name,
            organization_name=result.organization_name,
            admin_email=result.admin_email,
            api_key=result.api_key,
            subscription_status=result.subscription_status,
            created_at=result.created_at,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/login", response_model=LoginResponse, summary="Login with email and password")
async def login(request: LoginRequest) -> LoginResponse:
    """Login with email and password, returns customer info and API key."""
    try:
        # Get repositories and services
        repo = customer_repository()
        auth_svc = auth_service()
        
        # Find customer by email
        customer = await repo.find_by_email(request.email)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Get stored password hash
        password_hash = getattr(customer, "password_hash", None)
        if not password_hash:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not await auth_svc.verify_password(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Update last login
        customer.last_login = datetime.utcnow()
        await repo.save(customer)
        
        # Return customer info with API key
        return LoginResponse(
            customer_id=str(customer.id.value),
            tenant_name=customer.name.value,
            organization_name=getattr(customer, "organization_name", ""),
            admin_email=customer.email.value,
            api_key=customer.api_key.value,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed") from e
