from enum import StrEnum
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="CAMPUS_",
        extra="ignore",
    )

    app_name: str = "Campus Safety API"
    api_version: str = "v1"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = False
    database_url: str = Field(
        default="postgresql+asyncpg://campus_safety:campus_safety@localhost:5432/campus_safety"
    )
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    log_level: str = "INFO"

    @property
    def api_prefix(self) -> str:
        return f"/api/{self.api_version}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
