from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.schemas.system import HealthResponse

router = APIRouter()
SettingsDependency = Annotated[Settings, Depends(get_settings)]
SessionDependency = Annotated[AsyncSession, Depends(get_db_session)]


@router.get("/live", response_model=HealthResponse)
async def liveness(
    settings: SettingsDependency,
) -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=__version__,
        timestamp=datetime.now(UTC),
    )


@router.get(
    "/ready",
    response_model=HealthResponse,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": HealthResponse}},
)
async def readiness(
    session: SessionDependency,
    settings: SettingsDependency,
) -> HealthResponse | JSONResponse:
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response = HealthResponse(
            status="unavailable",
            service=settings.app_name,
            version=__version__,
            timestamp=datetime.now(UTC),
            database="unavailable",
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response.model_dump(mode="json", by_alias=True),
        )

    return HealthResponse(
        status="ready",
        service=settings.app_name,
        version=__version__,
        timestamp=datetime.now(UTC),
        database="available",
    )
