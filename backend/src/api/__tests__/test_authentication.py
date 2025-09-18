"""
Tests for API authentication middleware.

Tests authentication of API endpoints using Customer API keys.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

from src.api.main import app
from src.domain.tenant_management.customer_account import CustomerAccount, CustomerAccountStatus
from src.domain.shared.value_objects import TenantName, EmailAddress


@pytest.fixture
def test_customer():
    """Create a test customer with valid API key."""
    return CustomerAccount(
        name=TenantName("test-tenant"),
        email=EmailAddress("test@example.com"),
        status=CustomerAccountStatus.ACTIVE,
    )


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


class TestAPIAuthentication:
    """Test cases for API key authentication."""

    def test_register_endpoint_requires_no_auth(self, client):
        """Registration endpoint should work without authentication."""
        # Arrange
        registration_data = {
            "tenant_name": "new-tenant",
            "organization_name": "New Org",
            "admin_email": "admin@neworg.com",
        }

        # Act
        response = client.post("/api/v1/customers/register", json=registration_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "api_key" in data

    def test_health_endpoint_requires_no_auth(self, client):
        """Health endpoints should work without authentication."""
        # Act
        response = client.get("/health/")

        # Assert
        assert response.status_code == 200

    def test_future_endpoints_require_valid_api_key(self, client, test_customer):
        """Future protected endpoints should require valid API key."""
        # Arrange - Save customer to repository first
        from src.api.middleware.authentication import _customer_repository
        import asyncio
        asyncio.run(_customer_repository.save(test_customer))
        
        valid_api_key = test_customer.api_key.value
        headers = {"Authorization": f"Bearer {valid_api_key}"}

        # Act - This endpoint doesn't exist yet, but test the auth mechanism
        response = client.get("/api/v1/databases", headers=headers)

        # Assert - Should be 200 (endpoint exists) because auth middleware passed
        assert response.status_code == 200

    def test_protected_endpoint_rejects_invalid_api_key(self, client):
        """Protected endpoints should reject invalid API keys."""
        # Arrange
        invalid_headers = {"Authorization": "Bearer invalid_key"}

        # Act
        response = client.get("/api/v1/databases", headers=invalid_headers)

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "authentication" in data["detail"].lower()

    def test_protected_endpoint_rejects_missing_api_key(self, client):
        """Protected endpoints should reject requests without API key."""
        # Act
        response = client.get("/api/v1/databases")

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "required" in data["detail"].lower()

    def test_api_key_extracted_from_bearer_token(self, client, test_customer):
        """Authentication should extract API key from Bearer token."""
        # Arrange - Save customer to repository first
        from src.api.middleware.authentication import _customer_repository
        import asyncio
        asyncio.run(_customer_repository.save(test_customer))
        
        api_key = test_customer.api_key.value
        headers = {"Authorization": f"Bearer {api_key}"}

        # Act
        response = client.get("/api/v1/databases", headers=headers)

        # Assert - Should pass auth and hit the endpoint
        assert response.status_code == 200

    def test_api_key_validates_against_customer_repository(self, client):
        """Authentication should validate API key against customer repository."""
        # This test will be implemented when we add the middleware
        # For now, it's a placeholder to guide implementation
        pass

    def test_inactive_customer_api_key_rejected(self, client):
        """API keys from inactive customers should be rejected."""
        # This test will validate that suspended/deleted customers can't use API
        pass

    def test_expired_api_key_rejected(self, client):
        """Expired API keys should be rejected."""
        # Future test for API key expiration logic
        pass


class TestAuthenticationMiddleware:
    """Test cases for authentication middleware behavior."""

    def test_middleware_adds_customer_to_request_state(self, client, test_customer):
        """Middleware should add authenticated customer to request state."""
        # This will test that the middleware enriches the request with customer info
        pass

    def test_middleware_updates_api_key_last_used(self, client, test_customer):
        """Middleware should update API key last_used timestamp."""
        # This will test that successful auth updates the API key usage
        pass

    def test_middleware_logs_authentication_attempts(self, client):
        """Middleware should log authentication attempts for audit."""
        # This will test audit logging of auth attempts
        pass


class TestAuthenticationExceptions:
    """Test cases for authentication error scenarios."""

    def test_database_error_during_auth_returns_500(self, client):
        """Database errors during auth should return 500."""
        pass

    def test_malformed_authorization_header_returns_401(self, client):
        """Malformed Authorization header should return 401."""
        # Arrange
        malformed_headers = {"Authorization": "InvalidFormat"}

        # Act
        response = client.get("/api/v1/databases", headers=malformed_headers)

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "authorization" in data["detail"].lower() or "format" in data["detail"].lower()

    def test_empty_authorization_header_returns_401(self, client):
        """Empty Authorization header should return 401."""
        # Arrange
        empty_headers = {"Authorization": ""}

        # Act
        response = client.get("/api/v1/databases", headers=empty_headers)

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "required" in data["detail"].lower() or "authorization" in data["detail"].lower()om unittest.mock import AsyncMock

from src.api.main import app
from src.domain.tenant_management.customer_account import CustomerAccount, CustomerAccountStatus
from src.domain.shared.value_objects import TenantName, EmailAddress


@pytest.fixture
def test_customer():
    """Create a test customer with valid API key."""
    return CustomerAccount(
        name=TenantName("test-tenant"),
        email=EmailAddress("test@example.com"),
        status=CustomerAccountStatus.ACTIVE,
    )


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


class TestAPIAuthentication:
    """Test cases for API key authentication."""

    def test_register_endpoint_requires_no_auth(self, client):
        """Registration endpoint should work without authentication."""
        # Arrange
        registration_data = {
            "tenant_name": "new-tenant",
            "organization_name": "New Org",
            "admin_email": "admin@neworg.com",
        }

        # Act
        response = client.post("/api/v1/customers/register", json=registration_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "api_key" in data

    def test_health_endpoint_requires_no_auth(self, client):
        """Health endpoints should work without authentication."""
        # Act
        response = client.get("/health/")

        # Assert
        assert response.status_code == 200

    def test_future_endpoints_require_valid_api_key(self, client, test_customer):
        """Future protected endpoints should require valid API key."""
        # Arrange - Save customer to repository first
        from src.api.middleware.authentication import _customer_repository
        import asyncio
        asyncio.run(_customer_repository.save(test_customer))
        
        valid_api_key = test_customer.api_key.value
        headers = {"Authorization": f"Bearer {valid_api_key}"}

        # Act - This endpoint doesn't exist yet, but test the auth mechanism
        response = client.get("/api/v1/databases", headers=headers)

        # Assert - Should be 200 (endpoint exists) because auth middleware passed
        assert response.status_code == 200

    def test_protected_endpoint_rejects_invalid_api_key(self, client):
        """Protected endpoints should reject invalid API keys."""
        # Arrange
        invalid_headers = {"Authorization": "Bearer invalid_key"}

        # Act
        response = client.get("/api/v1/databases", headers=invalid_headers)

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "authentication" in data["detail"].lower()

    def test_protected_endpoint_rejects_missing_api_key(self, client):
        """Protected endpoints should reject requests without API key."""
        # Act
        response = client.get("/api/v1/databases")

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "required" in data["detail"].lower()

    def test_api_key_extracted_from_bearer_token(self, client, test_customer):
        """Authentication should extract API key from Bearer token."""
        # Arrange - Save customer to repository first
        from src.api.middleware.authentication import _customer_repository
        import asyncio
        asyncio.run(_customer_repository.save(test_customer))
        
        api_key = test_customer.api_key.value
        headers = {"Authorization": f"Bearer {api_key}"}

        # Act
        response = client.get("/api/v1/databases", headers=headers)

        # Assert - Should pass auth and hit the endpoint
        assert response.status_code == 200

    def test_api_key_validates_against_customer_repository(self, client):
        """Authentication should validate API key against customer repository."""
        # This test will be implemented when we add the middleware
        # For now, it's a placeholder to guide implementation
        pass

    def test_inactive_customer_api_key_rejected(self, client):
        """API keys from inactive customers should be rejected."""
        # This test will validate that suspended/deleted customers can't use API
        pass

    def test_expired_api_key_rejected(self, client):
        """Expired API keys should be rejected."""
        # Future test for API key expiration logic
        pass


class TestAuthenticationMiddleware:
    """Test cases for authentication middleware behavior."""

    def test_middleware_adds_customer_to_request_state(self, client, test_customer):
        """Middleware should add authenticated customer to request state."""
        # This will test that the middleware enriches the request with customer info
        pass

    def test_middleware_updates_api_key_last_used(self, client, test_customer):
        """Middleware should update API key last_used timestamp."""
        # This will test that successful auth updates the API key usage
        pass

    def test_middleware_logs_authentication_attempts(self, client):
        """Middleware should log authentication attempts for audit."""
        # This will test audit logging of auth attempts
        pass


class TestAuthenticationExceptions:
    """Test cases for authentication error scenarios."""

    def test_database_error_during_auth_returns_500(self, client):
        """Database errors during auth should return 500."""
        pass

    def test_malformed_authorization_header_returns_401(self, client):
        """Malformed Authorization header should return 401."""
        # Arrange
        malformed_headers = {"Authorization": "InvalidFormat"}

        # Act
        response = client.get("/api/v1/databases", headers=malformed_headers)

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "authorization" in data["detail"].lower()

    def test_empty_authorization_header_returns_401(self, client):
        """Empty Authorization header should return 401."""
        # Arrange
        empty_headers = {"Authorization": ""}

        # Act
        response = client.get("/api/v1/databases", headers=empty_headers)

        # Assert
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "required" in data["detail"].lower() or "authorization" in data["detail"].lower()