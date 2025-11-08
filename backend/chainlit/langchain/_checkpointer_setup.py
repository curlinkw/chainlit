import os
import sys

from langgraph.checkpoint.postgres import PostgresSaver


def setup(checkpointer_conn_string: str | None):
    if checkpointer_conn_string is not None:
        try:
            with PostgresSaver.from_conn_string(
                conn_string=checkpointer_conn_string
            ) as checkpointer:
                checkpointer.setup()
            print("Checkpointer setup completed successfully")
        except Exception as e:
            print(f"Checkpointer setup failed: {e}")
            sys.exit(1)


if __name__ == "__main__":
    setup(checkpointer_conn_string=os.getenv("CHECKPOINT_DATABASE_URL"))
