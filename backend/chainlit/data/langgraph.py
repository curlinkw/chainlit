from typing import Any

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.serde.base import SerializerProtocol
from psycopg import AsyncConnection, AsyncPipeline
from psycopg.rows import DictRow
from psycopg_pool import AsyncConnectionPool

from chainlit.data.chainlit_data_layer import ChainlitDataLayer
from chainlit.data.storage_clients.base import BaseStorageClient


class LanggraphDataLayer(ChainlitDataLayer):
    def __init__(
        self,
        database_url: str,
        checkpointer_conn_string: str,
        checkpointer_pipe: AsyncPipeline | None = None,
        checkpointer_serde: SerializerProtocol | None = None,
        checkpointer_pool_kwargs: dict[str, Any] = {},
        storage_client: BaseStorageClient | None = None,
        show_logger: bool = False,
    ):
        super().__init__(
            database_url=database_url,
            storage_client=storage_client,
            show_logger=show_logger,
        )

        self._async_pool = AsyncConnectionPool(
            conninfo=checkpointer_conn_string,
            open=True,
            connection_class=AsyncConnection[DictRow],
            **checkpointer_pool_kwargs,
        )
        self.checkpointer = AsyncPostgresSaver(
            conn=self._async_pool, pipe=checkpointer_pipe, serde=checkpointer_serde
        )

    async def delete_thread(self, thread_id: str):
        await super().delete_thread(thread_id=thread_id)
        await self.checkpointer.adelete_thread(thread_id=thread_id)

    async def close(self) -> None:
        await super().close()
        await self._async_pool.close()
