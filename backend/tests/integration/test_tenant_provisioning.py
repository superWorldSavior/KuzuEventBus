import os
import socket
from uuid import uuid4

import pytest

from src.application.usecases.provision_tenant_resources import (
    ProvisionTenantResourcesRequest,
    ProvisionTenantResourcesUseCase,
)
from src.infrastructure.database.database_metadata_repository import (
    PostgresDatabaseMetadataRepository,
)
from src.infrastructure.database.minio_bucket_provisioning import (
    MinioBucketProvisioningAdapter,
)
from src.infrastructure.kuzu.kuzu_database_provisioning import (
    KuzuDatabaseProvisioningAdapter,
)


def _tcp_open(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(autouse=True)
def _ensure_env(tmp_path, monkeypatch):
    # Kuzu data dir for the test
    monkeypatch.setenv("KUZU_DATA_DIR", str(tmp_path / "kuzu"))
    # Ensure test environment (our logging config will avoid file sinks)
    monkeypatch.setenv("ENVIRONMENT", "test")


@pytest.fixture(scope="module")
def _infra_or_skip():
    # MinIO defaults from docker-compose: localhost:9000
    if not _tcp_open("localhost", 9000):
        pytest.skip("MinIO not reachable on localhost:9000 - run docker-compose up minio")
    # Postgres defaults from docker-compose: localhost:5432
    if not _tcp_open("localhost", 5432):
        pytest.skip("Postgres not reachable on localhost:5432 - run docker-compose up postgres")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_provisioning_flow_creates_bucket_db_and_metadata(_infra_or_skip):
    tenant_id = uuid4()
    db_name = f"itdb-{uuid4().hex[:6]}"

    # Arrange adapters (infra)
    bucket_service = MinioBucketProvisioningAdapter()
    db_service = KuzuDatabaseProvisioningAdapter()
    metadata_repo = PostgresDatabaseMetadataRepository()

    usecase = ProvisionTenantResourcesUseCase(
        bucket_service=bucket_service,
        database_service=db_service,
        metadata_repository=metadata_repo,
        default_database_name="main",
    )

    # Act
    resp = await usecase.execute(
        ProvisionTenantResourcesRequest(tenant_id=tenant_id, database_name=db_name)
    )

    # Assert bucket logical identifier and kuzu file exists
    assert ":tenants/" in resp.bucket
    assert resp.database_name == db_name
    assert os.path.exists(resp.filesystem_path)

    # Metadata exists in Postgres
    found = await metadata_repo.find_by_name(tenant_id, db_name)
    assert found is not None
    assert str(found.filesystem_path) == resp.filesystem_path

    # Idempotency/business rule: second run with same name must fail fast
    with pytest.raises(ValueError):
        await usecase.execute(
            ProvisionTenantResourcesRequest(tenant_id=tenant_id, database_name=db_name)
        )
