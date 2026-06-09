from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.repair_log import RepairLog

from app.auth.auth_bearer import get_current_user, require_admin


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# SEND ASSET FOR REPAIR - ADMIN ONLY

@router.post("/repair/{asset_id}")
def send_for_repair(
    asset_id: str,
    issue_description: str = Query(..., min_length=1, max_length=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Send asset for repair - Admin only"""

    try:

        asset = db.query(Asset).filter(
            Asset.asset_id == asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {asset_id} not found"
            )

        asset.status_id = 3

        repair_log = RepairLog(
            asset_id=asset_id.upper(),
            issue_description=issue_description,
            sent_at=datetime.utcnow()
        )

        db.add(repair_log)
        db.commit()
        db.refresh(repair_log)

        return {
            "message": "Asset sent for repair",
            "repair_id": repair_log.repair_id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error sending asset for repair"
        )


# RETURN ASSET FROM REPAIR - ADMIN ONLY

@router.put("/repair/{repair_id}/return")
def return_from_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Return asset from repair - Admin only"""

    try:

        repair_log = db.query(RepairLog).filter(
            RepairLog.repair_id == repair_id
        ).first()

        if not repair_log:
            raise HTTPException(
                status_code=404,
                detail=f"Repair log {repair_id} not found"
            )

        if repair_log.returned_at is not None:
            raise HTTPException(
                status_code=400,
                detail="Asset already returned from repair"
            )

        repair_log.returned_at = datetime.utcnow()

        asset = db.query(Asset).filter(
            Asset.asset_id == repair_log.asset_id
        ).first()

        if asset:
            asset.status_id = 1

        db.commit()

        return {
            "message": "Asset returned from repair"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error returning asset from repair"
        )


# GET REPAIR HISTORY - ANY AUTHENTICATED USER

@router.get("/repair/logs")
def get_repair_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all repair logs - Any authenticated user"""

    try:

        logs = db.query(RepairLog).order_by(
            RepairLog.repair_id.desc()
        ).offset(skip).limit(limit).all()

        return logs

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching repair logs"
        )


@router.get("/assets/{asset_id}/repairs")
def get_asset_repairs(
    asset_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get repair history for specific asset - Any authenticated user"""

    try:

        asset = db.query(Asset).filter(
            Asset.asset_id == asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {asset_id} not found"
            )

        repairs = db.query(
            RepairLog
        ).filter(
            RepairLog.asset_id == asset_id.upper()
        ).order_by(
            RepairLog.repair_id.desc()
        ).offset(skip).limit(limit).all()

        return repairs

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching repair history"
        )

