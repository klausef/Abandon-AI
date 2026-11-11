from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk
from app.models.enums import AccountStatus, UserRole


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid_pk]
    user_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    badge_number: Mapped[str] = mapped_column(String(64), unique=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False))
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, native_enum=False), default=AccountStatus.ACTIVE
    )
    officer_code: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
