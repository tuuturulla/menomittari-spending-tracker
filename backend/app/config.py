from dataclasses import dataclass
from os import environ
from typing import Literal, cast


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime values that can differ between development, tests, and deployment."""

    database_url: str
    cors_origin: str
    session_cookie_secure: bool = False
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_ttl_seconds: int = 8 * 60 * 60
    login_max_attempts: int = 5
    login_window_seconds: int = 5 * 60


def _read_bool(name: str, default: bool) -> bool:
    raw_value = environ.get(name)
    if raw_value is None:
        return default
    if raw_value.casefold() in {"1", "true", "yes"}:
        return True
    if raw_value.casefold() in {"0", "false", "no"}:
        return False
    raise ValueError(f"{name} must be true or false")


def _read_positive_int(name: str, default: int) -> int:
    value = int(environ.get(name, str(default)))
    if value <= 0:
        raise ValueError(f"{name} must be positive")
    return value


def load_settings() -> Settings:
    cookie_secure = _read_bool("MENOMITTARI_SESSION_COOKIE_SECURE", False)
    cookie_samesite = environ.get(
        "MENOMITTARI_SESSION_COOKIE_SAMESITE",
        "lax",
    ).casefold()
    if cookie_samesite not in {"lax", "strict", "none"}:
        raise ValueError(
            "MENOMITTARI_SESSION_COOKIE_SAMESITE must be lax, strict, or none"
        )
    if cookie_samesite == "none" and not cookie_secure:
        raise ValueError("SameSite=None cookies must also be Secure")

    return Settings(
        database_url=environ.get(
            "MENOMITTARI_DATABASE_URL",
            "sqlite+pysqlite:////data/menomittari.db",
        ),
        cors_origin=environ.get(
            "MENOMITTARI_CORS_ORIGIN",
            "http://127.0.0.1:5173",
        ),
        session_cookie_secure=cookie_secure,
        session_cookie_samesite=cast(
            Literal["lax", "strict", "none"],
            cookie_samesite,
        ),
        session_ttl_seconds=_read_positive_int(
            "MENOMITTARI_SESSION_TTL_SECONDS",
            8 * 60 * 60,
        ),
        login_max_attempts=_read_positive_int(
            "MENOMITTARI_LOGIN_MAX_ATTEMPTS",
            5,
        ),
        login_window_seconds=_read_positive_int(
            "MENOMITTARI_LOGIN_WINDOW_SECONDS",
            5 * 60,
        ),
    )
