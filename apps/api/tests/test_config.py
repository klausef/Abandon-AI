from app.core.config import Environment, Settings


def test_default_api_prefix() -> None:
    settings = Settings(
        environment=Environment.TESTING,
        database_url="sqlite+aiosqlite:///:memory:",
    )
    assert settings.api_prefix == "/api/v1"
    assert settings.environment is Environment.TESTING


def test_cors_origins_are_structured() -> None:
    settings = Settings(database_url="sqlite+aiosqlite:///:memory:")
    assert "http://localhost:5173" in settings.cors_origins
