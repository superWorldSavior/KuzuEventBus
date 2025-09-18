import os
import uuid
import pytest

from src.infrastructure.kuzu.kuzu_query_execution_adapter import KuzuQueryExecutionAdapter

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module", autouse=True)
def kuzu_data_dir(tmp_path_factory):
    data_dir = tmp_path_factory.mktemp("kuzu_data")
    os.environ["KUZU_DATA_DIR"] = str(data_dir)
    return data_dir


@pytest.mark.asyncio
async def test_execute_simple_query_creates_db_and_returns_results():
    adapter = KuzuQueryExecutionAdapter()
    tenant_id = uuid.uuid4()
    database_id = uuid.uuid4()

    create_res = await adapter.execute_query(
        tenant_id=tenant_id,
        database_id=database_id,
        cypher="RETURN 1 AS ok",
    )
    assert "results" in create_res
    assert create_res.get("rows_returned", 0) >= 1

    # Second query should reuse same DB without error
    second_res = await adapter.execute_query(
        tenant_id=tenant_id,
        database_id=database_id,
        cypher="RETURN 2 AS ok2",
    )
    assert "results" in second_res
    assert second_res.get("rows_returned", 0) >= 1
    # Ensure no unexpected error key
    assert not second_res.get("error")


@pytest.mark.asyncio
async def test_explain_query():
    adapter = KuzuQueryExecutionAdapter()
    tenant_id = uuid.uuid4()
    database_id = uuid.uuid4()
    plan = await adapter.explain_query(
        tenant_id=tenant_id,
        database_id=database_id,
        cypher="MATCH (n) RETURN n LIMIT 5",
    )
    assert plan["plan"].startswith("EXPLAIN")


@pytest.mark.asyncio
async def test_error_returns_structure():
    adapter = KuzuQueryExecutionAdapter()
    tenant_id = uuid.uuid4()
    database_id = uuid.uuid4()
    bad = await adapter.execute_query(
        tenant_id=tenant_id,
        database_id=database_id,
        cypher="SELEC BAD SYNTAX",
    )
    assert "error" in bad
    assert bad["rows_returned"] == 0
