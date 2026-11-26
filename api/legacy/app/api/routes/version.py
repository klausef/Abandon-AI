from typing import Annotated

from fastapi import APIRouter, Depends

from app import __version__
from app.core.config import Settings, get_settings
from app.schemas.system import VersionResponse

router = APIRouter()
SettingsDependency = Annotated[Settings, Depends(get_settings)]


@router.get("/version", response_model=VersionResponse)
async def version(
    settings: SettingsDependency,
) -> VersionResponse:
    return VersionResponse(
        service=settings.app_name,
        version=__version__,
        api_version=settings.api_version,
        environment=settings.environment.value,
    )
