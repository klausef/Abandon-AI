from httpx import AsyncClient


async def test_root_metadata(client: AsyncClient) -> None:
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "service": "Campus Safety API",
        "version": "0.1.0",
        "documentation": "/docs",
        "health": "/api/v1/health/live",
    }


async def test_liveness(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "healthy"
    assert body["service"] == "Campus Safety API"
    assert body["version"] == "0.1.0"
    assert "timestamp" in body


async def test_readiness_checks_database(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["database"] == "available"
    assert response.json()["status"] == "ready"


async def test_version(client: AsyncClient) -> None:
    response = await client.get("/api/v1/version")
    assert response.status_code == 200
    assert response.json() == {
        "service": "Campus Safety API",
        "version": "0.1.0",
        "apiVersion": "v1",
        "environment": "testing",
    }


async def test_openapi_document(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/health/live" in paths
    assert "/api/v1/health/ready" in paths
    assert "/api/v1/version" in paths
