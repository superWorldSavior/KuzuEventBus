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


class TestAuthenticationExceptions:
    """Test cases for authentication error scenarios."""

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
        assert "required" in data["detail"].lower() or "authorization" in data["detail"].lower()