from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

FRONTEND_ORIGIN = "http://127.0.0.1:5173"


def make_client() -> TestClient:
    settings = Settings(
        database_url="sqlite+pysqlite:///:memory:",
        cors_origin=FRONTEND_ORIGIN,
    )
    return TestClient(create_app(settings))


def test_health_checks_api_and_database() -> None:
    with make_client() as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_only_the_configured_frontend() -> None:
    with make_client() as client:
        allowed = client.get("/api/health", headers={"Origin": FRONTEND_ORIGIN})
        denied = client.get(
            "/api/health",
            headers={"Origin": "https://untrusted.example"},
        )

    assert allowed.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
    assert "access-control-allow-origin" not in denied.headers
