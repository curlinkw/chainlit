import os

from langgraph.checkpoint.postgres import PostgresSaver


def setup(checkpointer_conn_string: str | None):
    if checkpointer_conn_string is not None:
        with PostgresSaver.from_conn_string(
            conn_string=checkpointer_conn_string
        ) as checkpointer:
            checkpointer.setup()

        if (status_file := os.getenv("CHECKPOINTER_STATUS_FILE")) is not None:
            with open(status_file, "w") as f:
                f.write("healthy")


if __name__ == "__main__":
    setup(checkpointer_conn_string=os.getenv("CHECKPOINT_DATABASE_URL"))
