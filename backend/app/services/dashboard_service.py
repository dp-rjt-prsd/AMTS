"""Dashboard aggregation, done in SQL and scoped to what the caller may see."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.enums import AssetStatusName, Role
from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.repair_log import RepairLog
from app.models.user import User
from app.services import asset_service, transfer_service


def _visible_asset_ids(db: Session, current_user: dict):
    stmt = select(Asset.asset_id)
    clause = asset_service.visibility_clause(db, current_user)
    if clause is not None:
        stmt = stmt.where(clause)
    return stmt


def build_summary(db: Session, current_user: dict) -> dict:
    role = current_user.get("role")
    user_id = current_user["user_id"]

    visible = _visible_asset_ids(db, current_user)

    # One grouped query for the whole status breakdown.
    status_rows = db.execute(
        select(AssetStatus.status_name, func.count(Asset.asset_id))
        .select_from(Asset)
        .join(AssetStatus, Asset.status_id == AssetStatus.status_id)
        .where(Asset.asset_id.in_(visible))
        .group_by(AssetStatus.status_name)
    ).all()

    by_status = {name: count for name, count in status_rows}

    total_assets = sum(by_status.values())

    assigned_to_me = db.execute(
        select(func.count(Asset.asset_id)).where(Asset.current_holder_id == user_id)
    ).scalar_one()

    open_repairs = db.execute(
        select(func.count(RepairLog.repair_id))
        .where(RepairLog.asset_id.in_(visible))
        .where(RepairLog.returned_at.is_(None))
    ).scalar_one()

    summary = {
        "role": role,
        "total_assets": total_assets,
        "available_assets": by_status.get(AssetStatusName.AVAILABLE.value, 0),
        "assigned_assets": by_status.get(AssetStatusName.ASSIGNED.value, 0),
        "repair_assets": by_status.get(AssetStatusName.REPAIR.value, 0),
        "retired_assets": by_status.get(AssetStatusName.RETIRED.value, 0),
        "open_repairs": open_repairs,
        "my_assets": assigned_to_me,
        "status_breakdown": by_status,
    }

    if role == Role.ADMIN.value:
        summary["total_users"] = db.execute(
            select(func.count(User.user_id))
        ).scalar_one()

    elif role == Role.DEPARTMENT_HEAD.value:
        dept_id = db.execute(
            select(User.dept_id).where(User.user_id == user_id)
        ).scalar_one_or_none()

        summary["team_members"] = db.execute(
            select(func.count(User.user_id)).where(User.dept_id == dept_id)
        ).scalar_one() if dept_id else 0

    recent = transfer_service.list_transfers(db, current_user, limit=5)
    summary["recent_transfers"] = [transfer_service.to_dict(t) for t in recent]

    return summary
