from enum import StrEnum


class UserRole(StrEnum):
    ADMINISTRATOR = "administrator"
    SECURITY_OFFICER = "security_officer"
    SUPERVISOR = "supervisor"


class AccountStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class CameraStatus(StrEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class CameraType(StrEnum):
    IP = "ip_camera"
    DOME = "dome_camera"
    BULLET = "bullet_camera"
