from datetime import datetime

from app.schemas.common import ApiModel


class HealthResponse(ApiModel):
    status: str
    service: str
    version: str
    timestamp: datetime
    database: str | None = None


class VersionResponse(ApiModel):
    service: str
    version: str
    api_version: str
    environment: str


class RootResponse(ApiModel):
    service: str
    version: str
    documentation: str
    health: str
