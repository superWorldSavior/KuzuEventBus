"""MinIO-based file storage service.

Implements the FileStorageService port using the MinIO Python client. All
blocking I/O is executed via asyncio.to_thread to keep async boundaries.
"""
from __future__ import annotations

import os
import asyncio
from typing import Optional
from uuid import UUID

from minio import Minio
from minio.error import S3Error

from src.domain.shared.ports.database_management import FileStorageService
from src.infrastructure.logging.config import infra_logger


def _get_env(name: str, default: Optional[str] = None) -> str:
    val = os.getenv(name, default)
    if val is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


class MinioFileStorageService(FileStorageService):
    def __init__(self) -> None:
        endpoint = _get_env("MINIO_ENDPOINT", "localhost:9000")
        access_key = _get_env("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = _get_env("MINIO_SECRET_KEY", "minioadmin123")
        secure = os.getenv("MINIO_SECURE", "false").lower() in ("1", "true", "yes")
        self._bucket = os.getenv("MINIO_BUCKET", "kuzu-databases")

        self._client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)

    async def _ensure_bucket(self) -> None:
        def _ensure():
            if not self._client.bucket_exists(self._bucket):
                self._client.make_bucket(self._bucket)

        await asyncio.to_thread(_ensure)

    def _object_key(self, tenant_id: UUID, database_id: UUID, filename: str) -> str:
        return f"tenants/{tenant_id}/{database_id}/{filename}"

    async def upload_database(self, tenant_id: UUID, database_id: UUID, file_content: bytes, filename: str) -> str:
        await self._ensure_bucket()

        object_name = self._object_key(tenant_id, database_id, filename)

        def _put():
            from io import BytesIO

            data = BytesIO(file_content)
            self._client.put_object(
                bucket_name=self._bucket,
                object_name=object_name,
                data=data,
                length=len(file_content),
                content_type="application/octet-stream",
            )

        try:
            await asyncio.to_thread(_put)
            infra_logger.info("MinIO upload complete", bucket=self._bucket, key=object_name)
            return f"s3://{self._bucket}/{object_name}"
        except S3Error as exc:  # noqa: BLE001
            raise RuntimeError(f"MinIO upload failed: {exc}") from exc

    async def download_database(self, file_path: str) -> bytes:
        # Expect s3://bucket/key or just key
        if file_path.startswith("s3://"):
            _, _, rest = file_path.partition("s3://")
            bucket, _, key = rest.partition("/")
        else:
            bucket, key = self._bucket, file_path

        def _get() -> bytes:
            response = self._client.get_object(bucket, key)
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()

        try:
            return await asyncio.to_thread(_get)
        except S3Error as exc:  # noqa: BLE001
            raise RuntimeError(f"MinIO download failed: {exc}") from exc

    async def delete_database(self, file_path: str) -> bool:
        if file_path.startswith("s3://"):
            _, _, rest = file_path.partition("s3://")
            bucket, _, key = rest.partition("/")
        else:
            bucket, key = self._bucket, file_path

        def _remove() -> bool:
            self._client.remove_object(bucket, key)
            return True

        try:
            return await asyncio.to_thread(_remove)
        except S3Error as exc:  # noqa: BLE001
            infra_logger.warning("MinIO delete failed", error=str(exc))
            return False

    async def file_exists(self, file_path: str) -> bool:
        if file_path.startswith("s3://"):
            _, _, rest = file_path.partition("s3://")
            bucket, _, key = rest.partition("/")
        else:
            bucket, key = self._bucket, file_path

        def _stat() -> bool:
            try:
                self._client.stat_object(bucket, key)
                return True
            except S3Error:
                return False

        return await asyncio.to_thread(_stat)

    async def get_file_size(self, file_path: str) -> int:
        if file_path.startswith("s3://"):
            _, _, rest = file_path.partition("s3://")
            bucket, _, key = rest.partition("/")
        else:
            bucket, key = self._bucket, file_path

        def _head() -> int:
            stat = self._client.stat_object(bucket, key)
            return stat.size

        try:
            return await asyncio.to_thread(_head)
        except S3Error as exc:  # noqa: BLE001
            raise RuntimeError(f"MinIO stat failed: {exc}") from exc

