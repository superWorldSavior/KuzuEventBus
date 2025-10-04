import asyncio
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, Mock
import pytest

from src.application.usecases.branching import CreateBranchUseCase
from src.application.dtos.branching import CreateBranchRequest


@pytest.mark.asyncio
async def test_create_branch_from_timestamp_clones_with_wal_replay():
    tenant_id = uuid4()
    source_db_id = uuid4()
    branch_db_id = uuid4()

    # Timestamp target (now)
    target_ts = datetime.now(timezone.utc)

    # Mocks for the three existing UCs
    snapshot_uc = Mock()
    snapshot_uc.execute = AsyncMock()  # Should NOT be called in timestamp mode (nearest snapshot path)

    provision_uc = Mock()
    provision_uc.execute = AsyncMock(return_value=Mock(
        database_id=branch_db_id,
        database_name="prod--branch--test",
    ))

    restore_uc = Mock()
    restore_uc.execute = AsyncMock(return_value=None)

    # PITR deps
    db_repo = Mock()
    db_repo.find_by_id = AsyncMock(return_value={
        "id": str(branch_db_id),
        "tenant_id": str(tenant_id),
        "file_path": "/var/lib/kuzu/dbs/branches/test/data.kuzu",
    })

    # Two snapshots, one before and one after target
    snapshots_repo = Mock()
    before_ts = (target_ts - timedelta(hours=1)).isoformat()
    after_ts = (target_ts + timedelta(hours=1)).isoformat()
    nearest_snapshot_id = uuid4()
    snapshots_repo.list_by_database = AsyncMock(return_value=[
        {
            "id": str(nearest_snapshot_id),
            "created_at": before_ts,
            "object_key": "s3://bucket/snap.tar.gz",
            "checksum": "abc123",
            "size_bytes": 1024,
        },
        {"id": str(uuid4()), "created_at": after_ts},
    ])
    snapshots_repo.save = AsyncMock(return_value=uuid4())  # For branch snapshot duplication

    # Storage: list WAL and return a small WAL file with a single query
    storage = Mock()
    storage.list_objects = AsyncMock(return_value=[
        {"key": f"tenants/{tenant_id}/{source_db_id}/wal/wal-{target_ts.strftime('%Y%m%dT%H%M%SZ')}.log", "size": 20},
    ])
    wal_line = '{"ts":"%s","query":"CREATE (n:Test)"}\n' % target_ts.isoformat()
    storage.download_database = AsyncMock(return_value=wal_line.encode("utf-8"))

    # Locks + cache not used explicitly in this path but required by ctor
    locks = Mock()
    locks.acquire_lock = AsyncMock(return_value="tok")
    locks.release_lock = AsyncMock(return_value=None)

    cache = Mock()
    cache.delete = AsyncMock(return_value=None)

    # KuzuQueryService: execute_query yields once
    async def _exec_query(**kwargs):
        yield {"ok": True}
    kuzu = Mock()
    kuzu.execute_query = Mock(side_effect=_exec_query)

    uc = CreateBranchUseCase(
        snapshot_uc=snapshot_uc,
        provision_uc=provision_uc,
        restore_uc=restore_uc,
        db_repo=db_repo,
        snapshots=snapshots_repo,
        storage=storage,
        locks=locks,
        cache=cache,
        kuzu=kuzu,
    )

    req = CreateBranchRequest(
        tenant_id=tenant_id,
        source_database_id=source_db_id,
        source_database_name="prod",
        branch_name="test",
        from_snapshot=target_ts.isoformat(),  # timestamp mode
        description="",
    )

    res = await uc.execute(req)

    # Was nearest snapshot used? restore called with it
    restore_uc.execute.assert_awaited()
    assert res.branch_name == "test"
    assert res.parent_database_name == "prod"
    assert res.branch_database_id == branch_db_id


@pytest.mark.asyncio
async def test_create_branch_from_timestamp_no_snapshot_before_raises():
    tenant_id = uuid4()
    source_db_id = uuid4()

    snapshot_uc = Mock()
    provision_uc = Mock()
    restore_uc = Mock()

    snapshots_repo = Mock()
    # No snapshots returned
    snapshots_repo.list_by_database = AsyncMock(return_value=[])

    uc = CreateBranchUseCase(
        snapshot_uc=snapshot_uc,
        provision_uc=provision_uc,
        restore_uc=restore_uc,
        db_repo=Mock(),
        snapshots=snapshots_repo,
        storage=Mock(),
        locks=Mock(),
        cache=Mock(),
        kuzu=Mock(),
    )

    with pytest.raises(ValueError):
        await uc.execute(CreateBranchRequest(
            tenant_id=tenant_id,
            source_database_id=source_db_id,
            source_database_name="prod",
            branch_name="b",
            from_snapshot=datetime.now(timezone.utc).isoformat(),
        ))
