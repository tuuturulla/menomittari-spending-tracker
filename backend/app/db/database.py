from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


def create_database_engine(database_url: str) -> Engine:
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        # FastAPI may use worker threads, so SQLite connections must allow hand-off.
        connect_args = {"autocommit": False, "check_same_thread": False}

    return create_engine(database_url, connect_args=connect_args)
