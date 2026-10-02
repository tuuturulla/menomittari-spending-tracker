from dataclasses import dataclass
from os import environ


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime values that can differ between development, tests, and deployment."""

    database_url: str
    cors_origin: str


def load_settings() -> Settings:
    return Settings(
        database_url=environ.get(
            "MENOMITTARI_DATABASE_URL",
            "sqlite+pysqlite:////data/menomittari.db",
        ),
        cors_origin=environ.get(
            "MENOMITTARI_CORS_ORIGIN",
            "http://127.0.0.1:5173",
        ),
    )
