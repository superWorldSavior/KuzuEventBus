"""
Authentication middleware for API key validation.

Validates Bearer tokens against Customer API keys in repository.
"""
from typing import Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.requests import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.domain.tenant_management.customer_account import CustomerAccount, CustomerAccountStatus
from src.domain.shared.ports.tenant_management import CustomerAccountRepository
from src.infrastructure.memory.tenant_repository import InMemoryTenantRepository
from src.infrastructure.logging.config import auth_logger

# Global repository instance for YAGNI approach
_customer_repository: CustomerAccountRepository = InMemoryTenantRepository()

security = HTTPBearer(auto_error=False)


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Middleware to authenticate API requests using Bearer tokens."""

    def __init__(self, app):
        super().__init__(app)
        self.protected_paths = ["/api/v1/databases"]  # Paths that require auth
        self.public_paths = ["/health", "/api/v1/customers/register", "/docs", "/redoc", "/openapi.json"]

    async def dispatch(self, request: Request, call_next):
        """Process request and validate authentication if needed."""
        
        # Check if path requires authentication
        if not self._requires_auth(request.url.path):
            return await call_next(request)

        # Extract and validate API key
        try:
            customer = await self._authenticate_request(request)
            if customer:
                # Add customer to request state for downstream use
                request.state.customer = customer
                # Update API key last used
                customer.api_key.mark_as_used()
                await _customer_repository.save_customer(customer)
                
                auth_logger.info(f"Authenticated request for tenant: {customer.name.value}")
                
            response = await call_next(request)
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            auth_logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service error"
            )

    def _requires_auth(self, path: str) -> bool:
        """Check if the path requires authentication."""
        
        # Check protected paths first
        for protected_path in self.protected_paths:
            if path.startswith(protected_path):
                return True
        
        # Check public paths 
        for public_path in self.public_paths:
            if path.startswith(public_path):
                return False
                
        # Root path is public
        if path == "/" or path == "":
            return False
                
        # Default to requiring auth for unknown paths
        return True

    async def _authenticate_request(self, request: Request) -> Optional[CustomerAccount]:
        """Extract and validate API key from request."""
        
        # Extract Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required"
            )

        # Parse Bearer token
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format"
            )

        # Extract API key
        api_key = auth_header[7:]  # Remove "Bearer " prefix
        if not api_key.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )

        # Validate API key against repository
        customer = await self._validate_api_key(api_key.strip())
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )

        return customer

    async def _validate_api_key(self, api_key: str) -> Optional[CustomerAccount]:
        """Validate API key against customer repository."""
        try:
            auth_logger.debug(f"Starting API key validation for key ending in: ...{api_key[-8:]}")
            
            # Get all customers and check API keys
            customers = await _customer_repository.list_all_customers()
            auth_logger.debug(f"Found {len(customers)} customers in repository")
            
            for customer in customers:
                if (customer.api_key.value == api_key and 
                    customer.api_key.is_active and 
                    customer.status in [CustomerAccountStatus.ACTIVE, CustomerAccountStatus.TRIAL]):
                    auth_logger.info(f"Successfully validated API key for tenant: {customer.name.value}")
                    return customer
                    
            auth_logger.warning(f"API key validation failed - no matching active customer found")
            return None
            
        except Exception as e:
            auth_logger.error(f"Error validating API key: {e}")
            return None


def get_current_customer(request: Request) -> CustomerAccount:
    """Extract current authenticated customer from request state."""
    customer = getattr(request.state, 'customer', None)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return customer