"""Create SQLAlchemy connections and short-lived sessions for account data."""

from collections.abc import Iterator
from sqlite3 import Connection as SQLiteConnection

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


def create_database_engine(database_url: str) -> Engine:
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        # FastAPI may use worker threads, so SQLite connections must allow hand-off.
        connect_args = {"autocommit": False, "check_same_thread": False}

    engine = create_engine(database_url, connect_args=connect_args)

    if database_url.startswith("sqlite"):
        # SQLite requires foreign-key enforcement to be enabled for every connection.
        @event.listens_for(engine, "connect")
        def enable_sqlite_foreign_keys(
            dbapi_connection: SQLiteConnection,
            _: object,
        ) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    """Close request-scoped sessions even when route handling raises an error."""

    with factory() as database_session:
        yield database_session
