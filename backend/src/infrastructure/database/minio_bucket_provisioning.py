"""MinIO adapter for BucketProvisioningService.

Creates (if absent) a per-tenant logical bucket namespace. We keep
one physical bucket (MINIO_BUCKET) and emulate tenant buckets via
prefix isolation to avoid bucket explosion in MinIO (which can be
costly). However the port contract returns a *bucket name* so we keep
the abstraction future-proof. If a dedicated bucket per tenant is
later required, the adapter can evolve without touching domain logic.
"""
from __future__ import annotations

import os
import asyncio
from typing import Optional
from uuid import UUID

from minio import Minio
from minio.error import S3Error

from src.domain.shared.ports.database_management import BucketProvisioningService
from src.infrastructure.logging.config import infra_logger


def _get_env(name: str, default: Optional[str] = None) -> str:
    val = os.getenv(name, default)
    if val is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


class MinioBucketProvisioningAdapter(BucketProvisioningService):
    def __init__(self) -> None:
        endpoint = _get_env("MINIO_ENDPOINT", "localhost:9000")
        access_key = _get_env("MINIO_ACCESS_KEY", "minioadmin")
        # Default secret aligned with our docker-compose configuration
        secret_key = _get_env("MINIO_SECRET_KEY", "minioadmin")
        self._physical_bucket = os.getenv("MINIO_BUCKET", "kuzu-databases")
        secure = os.getenv("MINIO_SECURE", "false").lower() in ("1", "true", "yes")
        self._client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)

    async def _ensure_physical_bucket(self) -> None:
        def _ensure():
            if not self._client.bucket_exists(self._physical_bucket):
                self._client.make_bucket(self._physical_bucket)

        await asyncio.to_thread(_ensure)

    async def ensure_bucket(self, tenant_id: UUID) -> str:  # returns logical bucket name
        await self._ensure_physical_bucket()
        # In prefix strategy, we just log the namespace creation intent.
        prefix = f"tenants/{tenant_id}/"

        # Optionally create a sentinel object to assert writability
        async def _put_sentinel() -> None:
            def _put():
                from io import BytesIO

                data = BytesIO(b"tenant-initialized")
                try:
                    self._client.put_object(
                        bucket_name=self._physical_bucket,
                        object_name=prefix + "_provisioned",  # sentinel
                        data=data,
                        length=len(b"tenant-initialized"),
                        content_type="text/plain",
                    )
                except S3Error as exc:  # noqa: BLE001
                    raise RuntimeError(f"MinIO bucket provisioning failed: {exc}") from exc

            return await asyncio.to_thread(_put)

        await _put_sentinel()
        infra_logger.info(
            "MinIO tenant bucket ensured", bucket=self._physical_bucket, prefix=prefix
        )
        # Return logical bucket identifier (physical bucket + prefix semantics)
        return f"{self._physical_bucket}:{prefix}"