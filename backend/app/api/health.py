from typing import Literal, cast

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

router = APIRouter(prefix="/api")


class HealthResponse(BaseModel):
    status: Literal["ok"]


@router.get("/health", response_model=HealthResponse)
def get_health(request: Request) -> HealthResponse:
    # A lightweight query proves that both the API and its database are ready.
    engine = cast(Engine, request.app.state.engine)
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return HealthResponse(status="ok")
