from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk
from app.models.enums import CameraStatus, CameraType


class Camera(TimestampMixin, Base):
    __tablename__ = "cameras"

    id: Mapped[uuid_pk]
    camera_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    location: Mapped[str] = mapped_column(String(160))
    building: Mapped[str] = mapped_column(String(160), index=True)
    floor: Mapped[str] = mapped_column(String(80), default="")
    camera_type: Mapped[CameraType] = mapped_column(Enum(CameraType, native_enum=False))
    ip_address: Mapped[str] = mapped_column(String(45))
    status: Mapped[CameraStatus] = mapped_column(
        Enum(CameraStatus, native_enum=False), default=CameraStatus.OFFLINE, index=True
    )
    monitoring_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution: Mapped[str] = mapped_column(String(32), default="1920x1080")
    installed_date: Mapped[date] = mapped_column(Date)
    last_connection: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
