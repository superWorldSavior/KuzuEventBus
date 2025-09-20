from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from src.application.usecases.get_query_status import GetQueryStatusUseCase, GetQueryStatusRequest
from src.application.usecases.get_query_results import GetQueryResultsUseCase, GetQueryResultsRequest
from src.application.usecases.list_query_transactions import ListQueryTransactionsUseCase, ListQueryTransactionsRequest
from src.application.usecases.cancel_query import CancelQueryUseCase, CancelQueryRequest
from src.application.usecases.get_query_statistics import GetQueryStatisticsUseCase, GetQueryStatisticsRequest
from src.domain.shared.ports import TransactionStatus


@pytest.fixture
def ports():
    return {
        "authz": AsyncMock(),
        "cache": AsyncMock(),
        "tx": AsyncMock(),
        "locks": AsyncMock(),
        "notify": AsyncMock(),
    }


@pytest.mark.asyncio
async def test_get_query_status_paths(ports):
    tenant = uuid4(); tx_id = uuid4()
    ports["authz"].check_permission.return_value = True
    uc = GetQueryStatusUseCase(ports["authz"], ports["cache"], ports["tx"])
    # cache miss → repo
    ports["cache"].get.return_value = None
    ports["tx"].find_by_id.return_value = {"tenant_id": str(tenant), "status": TransactionStatus.PENDING.value}
    res = await uc.execute(GetQueryStatusRequest(tenant_id=tenant, transaction_id=tx_id))
    assert res["status"] == TransactionStatus.PENDING.value


@pytest.mark.asyncio
async def test_get_query_results_completed_only(ports):
    tenant = uuid4(); tx_id = uuid4()
    ports["authz"].check_permission.return_value = True
    ports["tx"].find_by_id.return_value = {"tenant_id": str(tenant), "status": TransactionStatus.COMPLETED.value}
    ports["cache"].get.return_value = {"rows": 1}
    uc = GetQueryResultsUseCase(ports["authz"], ports["cache"], ports["tx"])
    res = await uc.execute(GetQueryResultsRequest(tenant_id=tenant, transaction_id=tx_id))
    assert res == {"rows": 1}


@pytest.mark.asyncio
async def test_list_query_transactions(ports):
    tenant = uuid4()
    ports["authz"].check_permission.return_value = True
    ports["tx"].find_by_tenant.return_value = [{"id": 1}]
    uc = ListQueryTransactionsUseCase(ports["authz"], ports["tx"])
    lst = await uc.execute(ListQueryTransactionsRequest(tenant_id=tenant, limit=10, offset=0))
    assert lst and isinstance(lst, list)


@pytest.mark.asyncio
async def test_cancel_query_paths(ports):
    tenant = uuid4(); tx_id = uuid4()
    ports["authz"].check_permission.return_value = True
    ports["tx"].find_by_id.return_value = {"tenant_id": str(tenant), "status": TransactionStatus.PENDING.value}
    ports["locks"].acquire_lock.return_value = "tkn"
    uc = CancelQueryUseCase(ports["authz"], ports["locks"], ports["tx"], ports["cache"], ports["notify"])
    ok = await uc.execute(CancelQueryRequest(tenant_id=tenant, transaction_id=tx_id))
    assert ok is True


@pytest.mark.asyncio
async def test_get_query_statistics(ports):
    tenant = uuid4()
    ports["authz"].check_permission.return_value = True
    ports["cache"].get.return_value = None
    ports["tx"].find_by_tenant.return_value = []
    uc = GetQueryStatisticsUseCase(ports["authz"], ports["cache"], ports["tx"])
    stats = await uc.execute(GetQueryStatisticsRequest(tenant_id=tenant))
    assert "total_queries" in stats
