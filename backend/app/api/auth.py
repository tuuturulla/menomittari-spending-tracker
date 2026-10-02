from collections.abc import Iterator
from datetime import datetime, timedelta
from hashlib import sha256
from hmac import compare_digest
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.database import session_scope
from app.db.models import AuthSession, User
from app.services.auth import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    as_utc,
    create_secret_token,
    hash_password,
    hash_token,
    normalize_email,
    utc_now,
    verify_password,
)
from app.services.rate_limit import LoginRateLimiter

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class PublicUser(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime


class CsrfToken(BaseModel):
    token: str


def get_database_session(request: Request) -> Iterator[Session]:
    yield from session_scope(request.app.state.session_factory)


DatabaseSession = Annotated[Session, Depends(get_database_session)]


def public_user(user: User) -> PublicUser:
    return PublicUser(
        id=user.id,
        email=user.email_normalized,
        created_at=user.created_at,
    )


def set_cookie(
    response: Response,
    *,
    key: str,
    value: str,
    settings: Settings,
    httponly: bool,
) -> None:
    response.set_cookie(
        key=key,
        value=value,
        max_age=settings.session_ttl_seconds,
        path="/api/auth",
        secure=settings.session_cookie_secure,
        httponly=httponly,
        samesite=settings.session_cookie_samesite,
    )


def require_csrf(request: Request) -> None:
    settings: Settings = request.app.state.settings
    header_token = request.headers.get("X-CSRF-Token")
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    if request.headers.get("Origin") != settings.cors_origin:
        raise HTTPException(status_code=403, detail="Pyynnön alkuperää ei hyväksytty.")
    if not header_token or not cookie_token or not compare_digest(
        header_token,
        cookie_token,
    ):
        raise HTTPException(status_code=403, detail="CSRF-tarkistus epäonnistui.")


def login_key(request: Request, email: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    # Hash the email so the limiter does not retain account identifiers as keys.
    email_key = sha256(email.encode("utf-8")).hexdigest()
    return f"{client_host}:{email_key}"


@router.get("/csrf", response_model=CsrfToken)
def issue_csrf_token(request: Request, response: Response) -> CsrfToken:
    token = create_secret_token()
    set_cookie(
        response,
        key=CSRF_COOKIE_NAME,
        value=token,
        settings=request.app.state.settings,
        httponly=False,
    )
    response.headers["Cache-Control"] = "no-store"
    return CsrfToken(token=token)


@router.post("/register", response_model=PublicUser, status_code=status.HTTP_201_CREATED)
def register(
    credentials: Credentials,
    request: Request,
    database: DatabaseSession,
) -> PublicUser:
    require_csrf(request)
    user = User(
        email_normalized=normalize_email(str(credentials.email)),
        password_hash=hash_password(credentials.password),
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(
            status_code=409,
            detail="Sähköposti on jo käytössä.",
        ) from error
    database.refresh(user)
    return public_user(user)


@router.post("/login", response_model=PublicUser)
def login(
    credentials: Credentials,
    request: Request,
    response: Response,
    database: DatabaseSession,
) -> PublicUser:
    require_csrf(request)
    email = normalize_email(str(credentials.email))
    limiter: LoginRateLimiter = request.app.state.login_rate_limiter
    limiter_key = login_key(request, email)
    retry_after = limiter.retry_after(limiter_key)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Liian monta kirjautumisyritystä. Yritä myöhemmin uudelleen.",
            headers={"Retry-After": str(retry_after)},
        )

    user = database.scalar(select(User).where(User.email_normalized == email))
    password_matches = verify_password(
        credentials.password,
        user.password_hash if user else None,
    )
    if user is None or not password_matches:
        limiter.record_failure(limiter_key)
        raise HTTPException(status_code=401, detail="Sähköposti tai salasana on väärä.")

    limiter.reset(limiter_key)
    existing_token = request.cookies.get(SESSION_COOKIE_NAME)
    if existing_token:
        existing = database.get(AuthSession, hash_token(existing_token))
        if existing:
            database.delete(existing)

    raw_token = create_secret_token()
    now = utc_now()
    database.add(
        AuthSession(
            token_hash=hash_token(raw_token),
            user_id=user.id,
            created_at=now,
            expires_at=now + timedelta(seconds=request.app.state.settings.session_ttl_seconds),
        )
    )
    database.commit()
    set_cookie(
        response,
        key=SESSION_COOKIE_NAME,
        value=raw_token,
        settings=request.app.state.settings,
        httponly=True,
    )
    response.headers["Cache-Control"] = "no-store"
    return public_user(user)


def authenticated_user(request: Request, database: Session) -> User:
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=401, detail="Kirjautuminen vaaditaan.")

    auth_session = database.get(AuthSession, hash_token(raw_token))
    if auth_session is None:
        raise HTTPException(status_code=401, detail="Kirjautuminen vaaditaan.")
    if as_utc(auth_session.expires_at) <= utc_now():
        database.delete(auth_session)
        database.commit()
        raise HTTPException(status_code=401, detail="Istunto on vanhentunut.")
    return auth_session.user


@router.get("/me", response_model=PublicUser)
def me(request: Request, database: DatabaseSession, response: Response) -> PublicUser:
    response.headers["Cache-Control"] = "no-store"
    return public_user(authenticated_user(request, database))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, database: DatabaseSession) -> None:
    require_csrf(request)
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if raw_token:
        auth_session = database.get(AuthSession, hash_token(raw_token))
        if auth_session:
            database.delete(auth_session)
            database.commit()

    settings: Settings = request.app.state.settings
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/api/auth",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )
    response.headers["Cache-Control"] = "no-store"
