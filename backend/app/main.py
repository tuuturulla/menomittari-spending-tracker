from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.config import Settings, load_settings
from app.db.database import create_database_engine


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or load_settings()
    engine = create_database_engine(runtime_settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        # Release pooled database connections during tests and graceful shutdowns.
        engine.dispose()

    app = FastAPI(title="Menomittari API", lifespan=lifespan)
    app.state.engine = engine

    # Credentials require an explicit browser origin instead of a wildcard.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[runtime_settings.cors_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )
    app.include_router(health_router)
    return app


app = create_app()
