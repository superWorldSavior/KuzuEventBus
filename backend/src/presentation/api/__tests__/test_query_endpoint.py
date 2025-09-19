import os
import uuid
import pytest
from fastapi.testclient import TestClient


pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    data_dir = tmp_path_factory.mktemp("kuzu_data")
    previous_dir = os.environ.get("KUZU_DATA_DIR")
    os.environ["KUZU_DATA_DIR"] = str(data_dir)

    from src.presentation.api.main import app  # Local import to ensure env var is set first

    with TestClient(app) as test_client:
        yield test_client

    if previous_dir is not None:
        os.environ["KUZU_DATA_DIR"] = previous_dir
    else:
        os.environ.pop("KUZU_DATA_DIR", None)


def _register_customer(client: TestClient):
    registration_data = {
        "tenant_name": f"tenant-{uuid.uuid4().hex[:6]}",
        "organization_name": "TestOrg",
        "admin_email": f"admin-{uuid.uuid4().hex[:6]}@example.com",
    }
    resp = client.post("/api/v1/customers/register", json=registration_data)
    assert resp.status_code == 200
    data = resp.json()
    return data["customer_id"], data["api_key"]


def test_query_endpoint_success(client: TestClient):
    customer_id, api_key = _register_customer(client)
    db_id = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {api_key}"}
    r = client.post(f"/api/v1/databases/{db_id}/query", json={"query": "RETURN 42 AS answer"}, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["rows_returned"] >= 1
    assert data["results"]


def test_query_endpoint_error(client: TestClient):
    customer_id, api_key = _register_customer(client)
    db_id = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {api_key}"}
    r = client.post(f"/api/v1/databases/{db_id}/query", json={"query": "THIS_IS_NOT_VALID_CYPHER"}, headers=headers)
    assert r.status_code == 400
    assert "failed" in r.json()["detail"].lower()
