"""
Test DTOs for validation and serialization.

Quick validation test for the Pydantic models.
"""
from datetime import datetime
from uuid import uuid4

import pytest

from src.application.dtos import (
    CustomerRegistrationRequest,
    CustomerRegistrationResponse,
    DatabaseCreateRequest,
    ErrorResponse,
    QuerySubmitRequest,
)


class TestCustomerAccountDTOs:
    """Test customer account DTOs."""

    def test_customer_registration_request_valid(self):
        """Test valid customer registration request."""
        request = CustomerRegistrationRequest(
            tenant_name="test-company",
            admin_email="admin@test-company.com",
            organization_name="Test Company Inc",
            password="test-password-123",
        )

        assert request.tenant_name == "test-company"
        assert request.admin_email == "admin@test-company.com"
        assert request.organization_name == "Test Company Inc"

    def test_customer_registration_request_invalid_tenant(self):
        """Test invalid tenant name validation."""
        with pytest.raises(ValueError):
            CustomerRegistrationRequest(
                tenant_name="invalid--name",  # consecutive hyphens
                admin_email="admin@test.com",
                organization_name="Test Co",
                password="test-password-123",
            )

    def test_customer_registration_request_invalid_email(self):
        """Test invalid email validation."""
        with pytest.raises(ValueError):
            CustomerRegistrationRequest(
                tenant_name="valid-name",
                admin_email="invalid-email",  # not a valid email
                organization_name="Test Co",
                password="test-password-123",
            )

    def test_customer_registration_response(self):
        """Test customer registration response serialization."""
        response = CustomerRegistrationResponse(
            customer_id=uuid4(),
            tenant_name="test-company",
            organization_name="Test Company Inc",
            admin_email="admin@test-company.com",
            api_key="test-api-key-123",
            subscription_status="active",
            created_at=datetime.utcnow(),
        )

        # Should serialize without errors
        json_data = response.dict()
        assert "customer_id" in json_data
        assert json_data["tenant_name"] == "test-company"


class TestDatabaseManagementDTOs:
    """Test database management DTOs."""

    def test_database_create_request_valid(self):
        """Test valid database creation request."""
        request = DatabaseCreateRequest(name="my_database", description="Test database")

        assert request.name == "my_database"
        assert request.description == "Test database"

    def test_database_create_request_invalid_name(self):
        """Test invalid database name validation."""
        with pytest.raises(ValueError):
            DatabaseCreateRequest(
                name="123invalid", description="Test"  # cannot start with number
            )

    def test_database_create_request_reserved_name(self):
        """Test reserved database name validation."""
        with pytest.raises(ValueError):
            DatabaseCreateRequest(name="admin", description="Test")  # reserved name


class TestQueryExecutionDTOs:
    """Test query execution DTOs."""

    def test_query_submit_request_valid(self):
        """Test valid query submission request."""
        request = QuerySubmitRequest(
            database_id=uuid4(),
            query="MATCH (n) RETURN n LIMIT 10",
            parameters={"limit": 10},
            timeout_seconds=300,
        )

        assert "MATCH" in request.query
        assert request.parameters["limit"] == 10
        assert request.timeout_seconds == 300

    def test_query_submit_request_dangerous_query(self):
        """Test dangerous query validation."""
        with pytest.raises(ValueError):
            QuerySubmitRequest(
                database_id=uuid4(),
                query="DROP DATABASE dangerous",  # dangerous operation
                timeout_seconds=300,
            )

    def test_query_submit_request_large_parameters(self):
        """Test large parameters validation."""
        large_params = {"data": "x" * 2000}  # too large

        with pytest.raises(ValueError):
            QuerySubmitRequest(
                database_id=uuid4(),
                query="MATCH (n) RETURN n",
                parameters=large_params,
                timeout_seconds=300,
            )


class TestCommonDTOs:
    """Test common DTOs."""

    def test_error_response(self):
        """Test error response model."""
        error = ErrorResponse(
            error="ValidationError",
            message="Invalid input provided",
            details={"field": "tenant_name", "issue": "too short"},
        )

        assert error.error == "ValidationError"
        assert error.message == "Invalid input provided"
        assert error.details["field"] == "tenant_name"
        assert isinstance(error.timestamp, datetime)
