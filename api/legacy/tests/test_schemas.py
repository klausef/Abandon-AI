from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.enums import AccountStatus, UserRole
from app.schemas.domain import BoundingBox, UserRead


def test_api_models_serialize_camel_case() -> None:
    user = UserRead(
        id=uuid4(),
        user_code="USR-001",
        full_name="Campus Administrator",
        email="admin@example.edu",
        badge_number="ADM-001",
        role=UserRole.ADMINISTRATOR,
        status=AccountStatus.ACTIVE,
        officer_code=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    payload = user.model_dump(mode="json", by_alias=True)
    assert payload["userCode"] == "USR-001"
    assert payload["fullName"] == "Campus Administrator"
    assert payload["role"] == "administrator"


def test_bounding_box_enforces_normalized_coordinates() -> None:
    valid = BoundingBox(x=0.1, y=0.2, width=0.3, height=0.4)
    assert valid.width == 0.3

    with pytest.raises(ValidationError):
        BoundingBox(x=1.2, y=0.2, width=0.3, height=0.4)
