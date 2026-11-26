import pytest
from sqlalchemy import inspect

from app import models  # noqa: F401
from app.db.base import Base
from app.db.session import engine


@pytest.mark.asyncio
async def test_foundation_metadata_creates_user_and_camera_tables() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        table_names = await connection.run_sync(
            lambda sync_connection: inspect(sync_connection).get_table_names()
        )
        await connection.run_sync(Base.metadata.drop_all)

    assert {"users", "cameras"}.issubset(table_names)


def test_metadata_uses_naming_convention() -> None:
    assert Base.metadata.naming_convention["pk"] == "pk_%(table_name)s"
    assert Base.metadata.naming_convention["fk"].startswith("fk_")
