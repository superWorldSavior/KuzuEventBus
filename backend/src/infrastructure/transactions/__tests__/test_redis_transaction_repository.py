from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import pytest

from src.domain.shared.ports.query_execution import TransactionStatus
from src.infrastructure.transactions.redis_transaction_repository import (
    RedisTransactionRepository,
)


class _FakePipeline:
    def __init__(self, redis: "_FakeRedis") -> None:
        self._redis = redis
        self._ops: list[tuple[str, tuple[Any, ...]]] = []

    def hgetall(self, key: str):  # type: ignore[override]
        self._ops.append(("hgetall", (key,)))
        return self

    async def execute(self) -> List[Dict[str, Any]]:  # type: ignore[override]
        results: List[Dict[str, Any]] = []
        for op, args in self._ops:
            if op == "hgetall":
                results.append(self._redis._hashes.get(args[0], {}).copy())
        self._ops.clear()
        return results


class _FakeRedis:
    def __init__(self) -> None:
        self._hashes: Dict[str, Dict[str, str]] = {}
        self._sets: Dict[str, set[str]] = {}

    async def hset(self, key: str, mapping: Dict[str, str]):  # type: ignore[override]
        self._hashes.setdefault(key, {}).update({k: str(v) for k, v in mapping.items()})

    async def hgetall(self, key: str) -> Dict[str, str]:  # type: ignore[override]
        return self._hashes.get(key, {}).copy()

    async def exists(self, key: str) -> int:  # type: ignore[override]
        return 1 if key in self._hashes else 0

    async def sadd(self, key: str, member: str):  # type: ignore[override]
        self._sets.setdefault(key, set()).add(member)

    async def srem(self, key: str, member: str):  # type: ignore[override]
        if key in self._sets:
            self._sets[key].discard(member)

    async def smembers(self, key: str) -> set[str]:  # type: ignore[override]
        return set(self._sets.get(key, set()))

    def pipeline(self) -> _FakePipeline:  # type: ignore[override]
        return _FakePipeline(self)


@pytest.mark.asyncio
async def test_save_find_update_and_indexing():
    redis = _FakeRedis()
    repo = RedisTransactionRepository(redis)

    tx_id = uuid4()
    tenant_id = uuid4()
    db_id = uuid4()

    # save
    await repo.save_transaction(
        transaction_id=tx_id,
        tenant_id=tenant_id,
        database_id=db_id,
        query="RETURN 1 AS ok",
        parameters={"p": 1},
        status=TransactionStatus.PENDING,
        timeout_seconds=5,
    )

    # find by id
    found = await repo.find_by_id(tx_id)
    assert found is not None
    assert found["tenant_id"] == str(tenant_id)
    assert found["database_id"] == str(db_id)
    assert found["status"] == TransactionStatus.PENDING.value

    # update running
    ok = await repo.update_status(tx_id, TransactionStatus.RUNNING)
    assert ok is True
    running = await repo.find_running_transactions()
    assert len(running) == 1
    assert running[0]["status"] == TransactionStatus.RUNNING.value
    assert "started_at" in running[0]

    # update completed
    ok = await repo.update_status(tx_id, TransactionStatus.COMPLETED, result_count=1)
    assert ok is True
    after = await repo.find_by_id(tx_id)
    assert after is not None
    assert after["status"] == TransactionStatus.COMPLETED.value
    assert after["result_count"] == "1"
    assert "completed_at" in after

    # index per tenant
    lst = await repo.find_by_tenant(tenant_id)
    assert len(lst) == 1
    assert lst[0]["transaction_id"] == str(tx_id)
