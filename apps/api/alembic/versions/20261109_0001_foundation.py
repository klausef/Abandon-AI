"""create foundation user and camera tables

Revision ID: 20261109_0001
Revises:
Create Date: 2026-11-09 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261109_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_code", sa.String(length=32), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("badge_number", sa.String(length=64), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "ADMINISTRATOR",
                "SECURITY_OFFICER",
                "SUPERVISOR",
                name="userrole",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "INACTIVE", name="accountstatus", native_enum=False),
            nullable=False,
        ),
        sa.Column("officer_code", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("badge_number", name=op.f("uq_users_badge_number")),
        sa.UniqueConstraint("officer_code", name=op.f("uq_users_officer_code")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_user_code"), "users", ["user_code"], unique=True)

    op.create_table(
        "cameras",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("camera_code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("location", sa.String(length=160), nullable=False),
        sa.Column("building", sa.String(length=160), nullable=False),
        sa.Column("floor", sa.String(length=80), nullable=False),
        sa.Column(
            "camera_type",
            sa.Enum("IP", "DOME", "BULLET", name="cameratype", native_enum=False),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(length=45), nullable=False),
        sa.Column(
            "status",
            sa.Enum("ONLINE", "OFFLINE", "MAINTENANCE", name="camerastatus", native_enum=False),
            nullable=False,
        ),
        sa.Column("monitoring_enabled", sa.Boolean(), nullable=False),
        sa.Column("resolution", sa.String(length=32), nullable=False),
        sa.Column("installed_date", sa.Date(), nullable=False),
        sa.Column("last_connection", sa.DateTime(timezone=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cameras")),
    )
    op.create_index(op.f("ix_cameras_building"), "cameras", ["building"], unique=False)
    op.create_index(op.f("ix_cameras_camera_code"), "cameras", ["camera_code"], unique=True)
    op.create_index(op.f("ix_cameras_status"), "cameras", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_cameras_status"), table_name="cameras")
    op.drop_index(op.f("ix_cameras_camera_code"), table_name="cameras")
    op.drop_index(op.f("ix_cameras_building"), table_name="cameras")
    op.drop_table("cameras")
    op.drop_index(op.f("ix_users_user_code"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
