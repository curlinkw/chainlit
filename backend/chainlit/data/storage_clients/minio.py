import io
from datetime import timedelta
from typing import Any, Dict, Union

from minio import Minio
from minio.commonconfig import ENABLED
from minio.versioningconfig import VersioningConfig

from chainlit import make_async
from chainlit.data.storage_clients.base import (
    BaseStorageClient,
    storage_expiry_time,
)
from chainlit.logger import logger


class MinIOStorageClient(BaseStorageClient):
    """S3-compatible storage client for MinIO.

    Uses the official MinIO Python SDK (`minio`) and wraps its synchronous
    methods in a thread pool to provide a fully asynchronous interface for
    Chainlit.

    All connection details must be passed explicitly to the constructor.
    This class does NOT read environment variables, keeping it pure and
    testable.
    """

    def __init__(
        self,
        bucket: str,
        endpoint: str,
        access_key: str,
        secret_key: str,
        secure: bool = True,
        region: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the MinIO storage client.

        Args:
            bucket: Name of the MinIO bucket to use.
            endpoint: MinIO server endpoint (e.g., "minio:9000").
            access_key: MinIO access key (username).
            secret_key: MinIO secret key (password).
            secure: Use HTTPS (True) or HTTP (False).
            region: Optional S3 region (rarely needed for MinIO).
            **kwargs: Additional arguments passed to `minio.Minio`.
        """
        self.bucket = bucket

        self._client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
            region=region,
            **kwargs,
        )

        self._secure = secure
        self._endpoint = endpoint

        try:
            if not self._client.bucket_exists(bucket):
                self._client.make_bucket(bucket)
                logger.info(f"Created MinIO bucket: {bucket}")

            self._client.set_bucket_versioning(bucket, VersioningConfig(ENABLED))

            logger.info(
                f"MinIOStorageClient initialized (bucket={bucket}, endpoint={endpoint})"
            )
        except Exception as e:
            logger.error(f"MinIOStorageClient initialization error: {e}")
            raise

    async def get_read_url(self, object_key: str) -> str:
        """
        Generate a presigned URL for reading the object.
        """
        return await make_async(self.sync_get_read_url)(object_key)

    def sync_get_read_url(self, object_key: str) -> str:
        """
        Synchronous wrapper for `get_read_url`.
        """
        try:
            url = self._client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=object_key,
                expires=timedelta(seconds=storage_expiry_time),
            )
            return url
        except Exception as e:
            logger.warning(f"MinIOStorageClient, get_read_url error: {e}")
            return object_key

    async def upload_file(
        self,
        object_key: str,
        data: Union[bytes, str],
        mime: str = "application/octet-stream",
        overwrite: bool = True,
        content_disposition: str | None = None,
    ) -> Dict[str, Any]:
        """Upload a file to MinIO."""
        return await make_async(self.sync_upload_file)(
            object_key,
            data,
            mime,
            overwrite,
            content_disposition,
        )

    def sync_upload_file(
        self,
        object_key: str,
        data: Union[bytes, str],
        mime: str = "application/octet-stream",
        overwrite: bool = True,
        content_disposition: str | None = None,
    ) -> Dict[str, Any]:
        """Synchronous upload implementation."""
        try:
            if isinstance(data, str):
                data = data.encode("utf-8")

            data_stream = io.BytesIO(data)

            self._client.put_object(
                bucket_name=self.bucket,
                object_name=object_key,
                data=data_stream,
                length=len(data),
                content_type=mime,
                metadata={"Content-Disposition": content_disposition}
                if content_disposition
                else None,
            )

            protocol = "https" if self._secure else "http"
            url = f"{protocol}://{self._endpoint}/{self.bucket}/{object_key}"

            return {"object_key": object_key, "url": url}
        except Exception as e:
            logger.warning(f"MinIOStorageClient, upload_file error: {e}")
            return {}

    async def delete_file(self, object_key: str) -> bool:
        """Delete a file from MinIO."""
        return await make_async(
            self._sync_delete_file,
        )(object_key)

    def _sync_delete_file(self, object_key: str) -> bool:
        """Synchronous delete implementation."""
        try:
            self._client.remove_object(bucket_name=self.bucket, object_name=object_key)
            return True
        except Exception as e:
            logger.warning(f"MinIOStorageClient, delete_file error: {e}")
            return False

    async def close(self) -> None:
        """Clean up resources."""
        # The minio.Minio client doesn't require explicit closing,
        # but we keep this method for compatibility with Chainlit's BaseStorageClient.
        pass
