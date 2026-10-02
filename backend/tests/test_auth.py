from hashlib import sha256

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import Settings
from app.db.base import Base
from app.db.models import AuthSession, User
from app.main import create_app

FRONTEND_ORIGIN = "http://127.0.0.1:5173"
PASSWORD = "correct horse battery staple"


@pytest.fixture
def auth_client(tmp_path):
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'auth.db'}",
        cors_origin=FRONTEND_ORIGIN,
        login_max_attempts=3,
        login_window_seconds=60,
    )
    app = create_app(settings)
    Base.metadata.create_all(app.state.engine)
    with TestClient(app) as client:
        yield client, app


def csrf_headers(client: TestClient) -> dict[str, str]:
    response = client.get("/api/auth/csrf", headers={"Origin": FRONTEND_ORIGIN})
    assert response.status_code == 200
    return {
        "Origin": FRONTEND_ORIGIN,
        "X-CSRF-Token": response.json()["token"],
    }


def register(client: TestClient, email: str = "Test.User@Example.com"):
    return client.post(
        "/api/auth/register",
        headers=csrf_headers(client),
        json={"email": email, "password": PASSWORD},
    )


def test_register_normalizes_email_and_hashes_password(auth_client) -> None:
    client, app = auth_client
    response = register(client)

    assert response.status_code == 201
    assert response.json()["email"] == "test.user@example.com"
    assert "password" not in response.text

    with app.state.session_factory() as database:
        user = database.scalar(select(User))
        assert user is not None
        assert user.password_hash.startswith("$argon2id$")
        assert PASSWORD not in user.password_hash


def test_register_rejects_duplicate_and_missing_csrf(auth_client) -> None:
    client, _ = auth_client
    assert register(client).status_code == 201
    assert register(client, "test.user@example.com").status_code == 409

    no_csrf = client.post(
        "/api/auth/register",
        headers={"Origin": FRONTEND_ORIGIN},
        json={"email": "other@example.com", "password": PASSWORD},
    )
    assert no_csrf.status_code == 403


def test_login_creates_hashed_server_session_and_authenticates_me(auth_client) -> None:
    client, app = auth_client
    assert register(client).status_code == 201

    response = client.post(
        "/api/auth/login",
        headers=csrf_headers(client),
        json={"email": "TEST.USER@example.com", "password": PASSWORD},
    )

    assert response.status_code == 200
    cookie_header = response.headers["set-cookie"]
    assert "menomittari_session=" in cookie_header
    assert "HttpOnly" in cookie_header
    assert "SameSite=lax" in cookie_header
    assert "Secure" not in cookie_header

    raw_token = client.cookies.get("menomittari_session")
    assert raw_token is not None
    with app.state.session_factory() as database:
        auth_session = database.scalar(select(AuthSession))
        assert auth_session is not None
        assert auth_session.token_hash == sha256(raw_token.encode()).hexdigest()
        assert auth_session.token_hash != raw_token

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test.user@example.com"


def test_failed_login_is_generic_and_rate_limited(auth_client) -> None:
    client, _ = auth_client
    assert register(client).status_code == 201

    for email in ["test.user@example.com"] * 3:
        response = client.post(
            "/api/auth/login",
            headers=csrf_headers(client),
            json={"email": email, "password": "wrong password value"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Sähköposti tai salasana on väärä."

    limited = client.post(
        "/api/auth/login",
        headers=csrf_headers(client),
        json={"email": "test.user@example.com", "password": PASSWORD},
    )
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) > 0


def test_unknown_user_gets_same_login_error(auth_client) -> None:
    client, _ = auth_client
    response = client.post(
        "/api/auth/login",
        headers=csrf_headers(client),
        json={"email": "missing@example.com", "password": PASSWORD},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Sähköposti tai salasana on väärä."


def test_logout_requires_csrf_and_invalidates_session(auth_client) -> None:
    client, app = auth_client
    assert register(client).status_code == 201
    assert client.post(
        "/api/auth/login",
        headers=csrf_headers(client),
        json={"email": "test.user@example.com", "password": PASSWORD},
    ).status_code == 200

    rejected = client.post("/api/auth/logout", headers={"Origin": FRONTEND_ORIGIN})
    assert rejected.status_code == 403

    accepted = client.post("/api/auth/logout", headers=csrf_headers(client))
    assert accepted.status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    with app.state.session_factory() as database:
        assert database.scalar(select(AuthSession)) is None


def test_secure_cookie_setting_is_applied(tmp_path) -> None:
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'secure.db'}",
        cors_origin=FRONTEND_ORIGIN,
        session_cookie_secure=True,
        session_cookie_samesite="none",
    )
    app = create_app(settings)
    Base.metadata.create_all(app.state.engine)
    with TestClient(app, base_url="https://testserver") as client:
        assert register(client).status_code == 201
        response = client.post(
            "/api/auth/login",
            headers=csrf_headers(client),
            json={"email": "test.user@example.com", "password": PASSWORD},
        )

    assert response.status_code == 200
    assert "Secure" in response.headers["set-cookie"]
    assert "SameSite=none" in response.headers["set-cookie"]
