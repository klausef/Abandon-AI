import os

import pytest
from httpx import ASGITransport, AsyncClient

os.environ["CAMPUS_ENVIRONMENT"] = "testing"
os.environ["CAMPUS_DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["CAMPUS_DEBUG"] = "false"

from app.main import app  # noqa: E402


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
