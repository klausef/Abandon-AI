from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.models.enums import AccountStatus, CameraStatus, CameraType, UserRole
from app.schemas.common import ApiModel


class DetectionObjectClass(StrEnum):
    PERSON = "person"
    BACKPACK = "backpack"
    HANDBAG = "handbag"
    SUITCASE = "suitcase"


class DetectionStatus(StrEnum):
    DETECTED = "detected"
    TRACKING = "tracking"
    STATIONARY = "stationary"
    UNATTENDED_MONITORING = "unattended_monitoring"
    POTENTIAL_INCIDENT = "potential_incident"


class IncidentPriority(StrEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(StrEnum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class UserRead(ApiModel):
    id: UUID
    user_code: str
    full_name: str
    email: str
    badge_number: str
    role: UserRole
    status: AccountStatus
    officer_code: str | None
    created_at: datetime
    updated_at: datetime


class CameraRead(ApiModel):
    id: UUID
    camera_code: str
    name: str
    location: str
    building: str
    floor: str
    camera_type: CameraType
    ip_address: str
    status: CameraStatus
    monitoring_enabled: bool
    resolution: str
    installed_date: date
    last_connection: datetime | None
    description: str
    created_at: datetime
    updated_at: datetime


class BoundingBox(ApiModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class CameraSnapshot(ApiModel):
    name: str
    location: str
    building: str


class DetectionRead(ApiModel):
    id: UUID
    detection_code: str
    camera_id: UUID
    object_class: DetectionObjectClass
    tracking_id: int
    confidence: float = Field(ge=0, le=1)
    timestamp: datetime
    bounding_box: BoundingBox
    status: DetectionStatus
    camera_snapshot: CameraSnapshot


class IncidentRead(ApiModel):
    id: UUID
    incident_number: str
    detection_id: UUID
    camera_id: UUID
    camera_name: str
    location: str
    object_type: DetectionObjectClass
    tracking_id: int
    confidence: float = Field(ge=0, le=1)
    unattended_duration: int = Field(ge=0)
    priority: IncidentPriority
    status: IncidentStatus
    assigned_officer_id: UUID | None
    assigned_officer_name: str | None
    description: str
    detected_at: datetime
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime
