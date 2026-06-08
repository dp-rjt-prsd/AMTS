from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from datetime import datetime

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.repair_log import RepairLog

from app.auth.auth_bearer import get_current_user


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# SEND ASSET FOR REPAIR

@router.post("/repair/{asset_id}")
def send_for_repair(
    asset_id: str,
    issue_description: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Only admins can manage repairs"
        )

    asset = db.query(Asset).filter(
        Asset.asset_id == asset_id
    ).first()

    if not asset:

        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    # UPDATE STATUS TO IN_REPAIR

    asset.status_id = 3

    repair_log = RepairLog(
        asset_id=asset_id,
        issue_description=issue_description,
        sent_at=datetime.utcnow()
    )

    db.add(repair_log)

    db.commit()

    return {
        "message": "Asset sent for repair"
    }


# RETURN ASSET FROM REPAIR

@router.put("/repair/{repair_id}/return")
def return_from_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Only admins can manage repairs"
        )

    repair_log = db.query(RepairLog).filter(
        RepairLog.repair_id == repair_id
    ).first()

    if not repair_log:

        raise HTTPException(
            status_code=404,
            detail="Repair log not found"
        )

    if repair_log.returned_at is not None:

        raise HTTPException(
            status_code=400,
            detail="Asset already returned from repair"
        )

    repair_log.returned_at = datetime.utcnow()

    # UPDATE ASSET STATUS BACK TO AVAILABLE

    asset = db.query(Asset).filter(
        Asset.asset_id == repair_log.asset_id
    ).first()

    asset.status_id = 1

    db.commit()

    return {
        "message": "Asset returned from repair"
    }


# GET REPAIR HISTORY

@router.get("/repair/logs")
def get_repair_logs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    logs = db.query(RepairLog).all()

    return logs

@router.get("/assets/{asset_id}/repairs")
def get_asset_repairs(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    repairs = db.query(
        RepairLog
    ).filter(
        RepairLog.asset_id == asset_id
    ).all()

    return repairs

