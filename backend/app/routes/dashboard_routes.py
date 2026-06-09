from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from sqlalchemy import func

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.user import User
from app.models.transfer_log import AssetTransferLog

from app.auth.auth_bearer import get_current_user, require_admin


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.get("/dashboard")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get dashboard summary - Any authenticated user
    Full stats for Admins, limited stats for others
    """

    total_assets = db.query(Asset).count()

    total_users = db.query(User).count()

    available_assets = db.query(Asset).filter(
        Asset.status_id == 1
    ).count()

    assigned_assets = db.query(Asset).filter(
        Asset.current_holder_id != None
    ).count()

    repair_assets = db.query(Asset).filter(
        Asset.status_id == 3
    ).count()

    retired_assets = db.query(Asset).filter(
        Asset.status_id == 4
    ).count()

    recent_transfers = db.query(
        AssetTransferLog
    ).order_by(
        AssetTransferLog.transferred_at.desc()
    ).limit(5).all()

    return {
        "total_assets": total_assets,
        "total_users": total_users,
        "available_assets": available_assets,
        "assigned_assets": assigned_assets,
        "repair_assets": repair_assets,
        "retired_assets": retired_assets,
        "recent_transfers": recent_transfers,
        "user_role": current_user.get("role")
    }