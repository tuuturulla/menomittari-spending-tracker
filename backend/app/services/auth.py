from datetime import datetime, timezone
from hashlib import sha256
from secrets import token_urlsafe

from pwdlib import PasswordHash

SESSION_COOKIE_NAME = "menomittari_session"
CSRF_COOKIE_NAME = "menomittari_csrf"

_password_hash = PasswordHash.recommended()
# Verifying this value for unknown users keeps failed logins closer in cost.
_dummy_password_hash = _password_hash.hash("not-a-real-menomittari-password")


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, encoded_hash: str | None) -> bool:
    return _password_hash.verify(password, encoded_hash or _dummy_password_hash)


def create_secret_token() -> str:
    return token_urlsafe(32)


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
