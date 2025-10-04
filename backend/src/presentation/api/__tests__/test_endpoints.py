"""
Test FastAPI endpoints.
YAGNI approach - basic functionality tests.
"""
import pytest
from fastapi.testclient import TestClient

from src.presentation.api.main import app

client = TestClient(app)

pytestmark = pytest.mark.integration


def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Kuzu Event Bus API is running"
    assert data["version"] == "0.1.0"


def test_health_check():
    """Test health check."""
    response = client.get("/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_readiness_check():
    """Test readiness check."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


import uuid


def test_customer_registration():
    """Test customer registration endpoint."""
    registration_data = {
        "tenant_name": f"test-company-inc-{uuid.uuid4().hex[:6]}",
        "organization_name": "Test Company Inc",
        "admin_email": f"admin-{uuid.uuid4().hex[:8]}@testcompany.com",
        # Remove subscription_plan for YAGNI simplicity
        "password": "test-password-123",
    }
    
    response = client.post("/api/v1/auth/register", json=registration_data)
    
    # Debug: print response for troubleshooting
    if response.status_code != 200:
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    
    assert response.status_code == 200
    
    data = response.json()
    assert "customer_id" in data
    assert data["tenant_name"].startswith("test-company-inc-")
    assert data["organization_name"] == "Test Company Inc"
    assert "api_key" in data