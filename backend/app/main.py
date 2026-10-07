"""Create the account API with its database, routes, CORS, and login rate limiter."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.config import Settings, load_settings
from app.db.database import create_database_engine, create_session_factory
from app.services.rate_limit import LoginRateLimiter


def create_app(settings: Settings | None = None) -> FastAPI:
    """Assemble the API and shared services for one backend process."""
    runtime_settings = settings or load_settings()
    engine = create_database_engine(runtime_settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        # Release pooled database connections during tests and graceful shutdowns.
        engine.dispose()

    app = FastAPI(title="Menomittari API", lifespan=lifespan)
    app.state.engine = engine
    app.state.settings = runtime_settings
    app.state.session_factory = create_session_factory(engine)
    app.state.login_rate_limiter = LoginRateLimiter(
        runtime_settings.login_max_attempts,
        runtime_settings.login_window_seconds,
    )

    # Credentials require an explicit browser origin instead of a wildcard.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[runtime_settings.cors_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)
    return app


app = create_app()
