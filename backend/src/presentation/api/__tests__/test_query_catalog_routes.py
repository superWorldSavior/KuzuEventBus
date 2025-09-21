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
    os.environ["ENVIRONMENT"] = "test"

    from src.presentation.api.main import app  # import after env set

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
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["customer_id"], data["api_key"]


def test_popular_and_favorites_happy_path(client: TestClient):
    customer_id, api_key = _register_customer(client)
    headers = {"Authorization": f"Bearer {api_key}"}
    database_id = str(uuid.uuid4())

    query_text = "MATCH (n) RETURN n"

    # Submit the same query multiple times to raise its usage
    for _ in range(3):
        r = client.post(
            f"/api/v1/databases/{database_id}/query",
            json={"query": query_text, "parameters": {}, "timeout_seconds": 1},
            headers=headers,
        )
        assert r.status_code == 202

    # Popular should include this query
    r_pop = client.get(f"/api/v1/databases/{database_id}/queries/popular", headers=headers)
    assert r_pop.status_code == 200, r_pop.text
    popular = r_pop.json()
    assert any(item["query_text"] == query_text for item in popular)

    # Add to favorites
    r_fav_add = client.post(
        f"/api/v1/databases/{database_id}/queries/favorites",
        json={"query": query_text},
        headers=headers,
    )
    assert r_fav_add.status_code == 200, r_fav_add.text
    fav_added = r_fav_add.json()
    assert fav_added["query_text"] == query_text
    qh = fav_added["query_hash"]

    # List favorites should include it
    r_fav_list = client.get(f"/api/v1/databases/{database_id}/queries/favorites", headers=headers)
    assert r_fav_list.status_code == 200
    favs = r_fav_list.json()
    assert any(f["query_hash"] == qh for f in favs)

    # Popular should now exclude it
    r_pop2 = client.get(f"/api/v1/databases/{database_id}/queries/popular", headers=headers)
    assert r_pop2.status_code == 200
    popular2 = r_pop2.json()
    assert all(item["query_hash"] != qh for item in popular2)

    # Remove favorite
    r_del = client.delete(
        f"/api/v1/databases/{database_id}/queries/favorites/{qh}",
        headers=headers,
    )
    assert r_del.status_code == 200
    assert r_del.json()["removed"] is True

    # List favorites should not include it anymore
    r_fav_list2 = client.get(f"/api/v1/databases/{database_id}/queries/favorites", headers=headers)
    assert r_fav_list2.status_code == 200
    favs2 = r_fav_list2.json()
    assert all(f["query_hash"] != qh for f in favs2)

    # Popular can include it again (was excluded only while favorite)
    r_pop3 = client.get(f"/api/v1/databases/{database_id}/queries/popular", headers=headers)
    assert r_pop3.status_code == 200
    popular3 = r_pop3.json()
    assert any(item["query_hash"] == qh for item in popular3)
