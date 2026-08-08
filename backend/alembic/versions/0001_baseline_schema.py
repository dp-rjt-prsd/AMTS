"""Baseline schema.

Revision ID: 0001
Revises:
Create Date: 2026-08-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROLE_VALUES = ("ADMIN", "DEPARTMENT_HEAD", "EMPLOYEE")

AUDIT_ACTION_VALUES = (
    "ASSET_CREATED",
    "ASSET_DELETED",
    "ASSET_RETIRED",
    "ASSET_STATUS_CHANGED",
    "ASSET_TRANSFERRED",
    "ASSET_RETURNED",
    "ASSET_SCANNED_OUT",
    "REPAIR_OPENED",
    "REPAIR_CLOSED",
    "USER_CREATED",
    "USER_ROLE_CHANGED",
    "LOGIN_SUCCEEDED",
    "LOGIN_FAILED",
)


def upgrade() -> None:
    # Reference tables
    op.create_table(
        "departments",
        sa.Column("dept_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dept_name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("dept_id"),
        sa.UniqueConstraint("dept_name"),
    )
    op.create_index("ix_departments_dept_id", "departments", ["dept_id"])

    op.create_table(
        "asset_types",
        sa.Column("asset_type_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_type_name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("asset_type_id"),
        sa.UniqueConstraint("asset_type_name"),
    )
    op.create_index("ix_asset_types_asset_type_id", "asset_types", ["asset_type_id"])

    op.create_table(
        "asset_statuses",
        # autoincrement disabled so seed.py can pin the four ids.
        sa.Column("status_id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("status_name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("status_id"),
        sa.UniqueConstraint("status_name"),
    )
    op.create_index("ix_asset_statuses_status_id", "asset_statuses", ["status_id"])

    # Users
    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("emp_id", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("pw_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum(*ROLE_VALUES, name="role"), nullable=False),
        sa.Column("dept_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["dept_id"], ["departments.dept_id"]),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("emp_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_user_id", "users", ["user_id"])
    op.create_index("ix_users_dept_id", "users", ["dept_id"])
    op.create_index("ix_users_dept_role", "users", ["dept_id", "role"])

    # Assets
    op.create_table(
        "assets",
        sa.Column("asset_id", sa.String(length=50), nullable=False),
        sa.Column("procurement_by", sa.String(length=100), nullable=True),
        sa.Column("purchase_order_id", sa.String(length=100), nullable=True),
        sa.Column("asset_name", sa.String(length=150), nullable=False),
        sa.Column("asset_type_id", sa.Integer(), nullable=False),
        sa.Column("status_id", sa.Integer(), nullable=False),
        sa.Column("current_holder_id", sa.Integer(), nullable=True),
        sa.Column("serial_number", sa.String(length=100), nullable=True),
        sa.Column("price", sa.DECIMAL(precision=12, scale=2), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["asset_type_id"], ["asset_types.asset_type_id"]),
        sa.ForeignKeyConstraint(["status_id"], ["asset_statuses.status_id"]),
        sa.ForeignKeyConstraint(["current_holder_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("asset_id"),
        sa.UniqueConstraint("serial_number"),
    )
    op.create_index("ix_assets_asset_id", "assets", ["asset_id"])
    op.create_index("ix_assets_asset_type_id", "assets", ["asset_type_id"])
    op.create_index("ix_assets_status_id", "assets", ["status_id"])
    op.create_index("ix_assets_current_holder_id", "assets", ["current_holder_id"])

    # Transfer log
    op.create_table(
        "asset_transfer_logs",
        sa.Column("transfer_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", sa.String(length=50), nullable=False),
        sa.Column("from_user_id", sa.Integer(), nullable=True),
        sa.Column("to_user_id", sa.Integer(), nullable=True),
        sa.Column("performed_by_id", sa.Integer(), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column(
            "transferred_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.asset_id"]),
        sa.ForeignKeyConstraint(["from_user_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["to_user_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["performed_by_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("transfer_id"),
    )
    op.create_index("ix_asset_transfer_logs_transfer_id", "asset_transfer_logs", ["transfer_id"])
    op.create_index("ix_asset_transfer_logs_asset_id", "asset_transfer_logs", ["asset_id"])
    op.create_index("ix_asset_transfer_logs_performed_by_id", "asset_transfer_logs", ["performed_by_id"])
    op.create_index("ix_transfer_asset_time", "asset_transfer_logs", ["asset_id", "transferred_at"])

    # Repair log
    op.create_table(
        "repair_logs",
        sa.Column("repair_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", sa.String(length=50), nullable=False),
        sa.Column("issue_description", sa.Text(), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("returned_at", sa.DateTime(), nullable=True),
        sa.Column("opened_by_id", sa.Integer(), nullable=False),
        sa.Column("closed_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.asset_id"]),
        sa.ForeignKeyConstraint(["opened_by_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["closed_by_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("repair_id"),
    )
    op.create_index("ix_repair_logs_repair_id", "repair_logs", ["repair_id"])
    op.create_index("ix_repair_logs_asset_id", "repair_logs", ["asset_id"])
    op.create_index("ix_repair_asset_open", "repair_logs", ["asset_id", "returned_at"])

    # Audit
    op.create_table(
        "audit_events",
        sa.Column("event_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_email", sa.String(length=100), nullable=True),
        sa.Column(
            "action",
            sa.Enum(*AUDIT_ACTION_VALUES, name="auditaction"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=50), nullable=False),
        sa.Column("before", sa.Text(), nullable=True),
        sa.Column("after", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_index("ix_audit_events_event_id", "audit_events", ["event_id"])
    op.create_index("ix_audit_events_actor_id", "audit_events", ["actor_id"])
    op.create_index("ix_audit_events_action", "audit_events", ["action"])
    op.create_index("ix_audit_events_entity_id", "audit_events", ["entity_id"])
    op.create_index("ix_audit_entity", "audit_events", ["entity_type", "entity_id", "occurred_at"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("repair_logs")
    op.drop_table("asset_transfer_logs")
    op.drop_table("assets")
    op.drop_table("users")
    op.drop_table("asset_statuses")
    op.drop_table("asset_types")
    op.drop_table("departments")
