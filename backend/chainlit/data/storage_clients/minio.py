from datetime import timedelta
from io import BytesIO
from typing import Any, Dict, Union

from minio import Minio
from minio.credentials.providers import Provider
from minio.helpers import ObjectWriteResult
from urllib3 import PoolManager

from chainlit import make_async
from chainlit.data.storage_clients.base import BaseStorageClient, storage_expiry_time
from chainlit.logger import logger


def _to_bytes(data: Union[bytes, str]) -> bytes:
    return data.encode("utf-8") if isinstance(data, str) else data


class MinioStorageClient(BaseStorageClient):
    """
    Class to enable Minio storage provider
    """

    def init(
        self,
        endpoint: str,
        bucket: str,
        access_key: str | None = None,
        secret_key: str | None = None,
        session_token: str | None = None,
        secure: bool = True,
        region: str | None = None,
        http_client: PoolManager | None = None,
        credentials: Provider | None = None,
        cert_check: bool = True,
    ):
        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            session_token=session_token,
            secure=secure,
            region=region,
            http_client=http_client,
            credentials=credentials,
            cert_check=cert_check,
        )
        self.bucket = bucket
        self._make_bucket_if_not_exists(bucket=bucket)

    def _make_bucket_if_not_exists(self, bucket: str):
        try:
            if not (self.client.bucket_exists(bucket_name=bucket)):
                self.client.make_bucket(bucket_name=bucket)
        except Exception as e:
            logger.warning(f"MinioStorageClient, bucket error: {e}")

    def sync_upload_file(
        self,
        object_key: str,
        data: Union[bytes, str],
        mime: str = "application/octet-stream",
        overwrite: bool = True,
    ) -> Dict[str, Any]:
        try:
            data_bytes = _to_bytes(data)
            write_result: ObjectWriteResult = self.client.put_object(
                bucket_name=self.bucket,
                object_name=object_key,
                data=BytesIO(data_bytes),
                content_type=mime,
                length=len(data_bytes),
            )
            return {"write_result": write_result}
        except Exception as e:
            logger.warning(f"MinioStorageClient, upload_file error: {e}")
            return {}

    async def upload_file(
        self,
        object_key: str,
        data: Union[bytes, str],
        mime: str = "application/octet-stream",
        overwrite: bool = True,
        content_disposition: str | None = None,
    ) -> Dict[str, Any]:
        return await make_async(self.sync_upload_file)(
            object_key, data, mime, overwrite
        )

    def sync_delete_file(self, object_key: str) -> bool:
        try:
            self.client.remove_object(bucket_name=self.bucket, object_name=object_key)
            return True
        except Exception as e:
            logger.warning(f"S3StorageClient, delete_file error: {e}")
            return False

    async def delete_file(self, object_key: str) -> bool:
        return await make_async(self.sync_delete_file)(object_key)

    def sync_get_read_url(self, object_key: str) -> str:
        try:
            return self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=object_key,
                expires=timedelta(seconds=storage_expiry_time),
            )
        except Exception as e:
            logger.warning(f"MinioStorageClient, get_read_url error: {e}")
            return object_key

    async def get_read_url(self, object_key: str) -> str:
        return await make_async(self.sync_get_read_url)(object_key)
