from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.user import User
from app.models.transfer_log import AssetTransferLog

from app.schemas.transfer_schema import TransferCreate

from app.auth.auth_bearer import get_current_user


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.post("/transfer")
def transfer_asset(
    transfer: TransferCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # ONLY ADMIN CAN TRANSFER

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Only admins can transfer assets"
        )

    # CHECK ASSET

    asset = db.query(Asset).filter(
        Asset.asset_id == transfer.asset_id
    ).first()

    if not asset:

        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    # CHECK RECEIVING USER

    to_user = db.query(User).filter(
        User.user_id == transfer.to_user_id
    ).first()

    if not to_user:

        raise HTTPException(
            status_code=404,
            detail="Receiving user not found"
        )

    # STORE OLD HOLDER

    old_holder = asset.current_holder_id

    # UPDATE CURRENT HOLDER

    asset.current_holder_id = transfer.to_user_id

    # CREATE TRANSFER LOG

    transfer_log = AssetTransferLog(
        asset_id=transfer.asset_id,
        from_user_id=old_holder,
        to_user_id=transfer.to_user_id,
        remarks=transfer.remarks
    )

    db.add(transfer_log)

    db.commit()

    return {
        "message": "Asset transferred successfully"
    }

@router.get("/transfers")
def get_transfers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    transfers = db.query(
        AssetTransferLog
    ).order_by(
        AssetTransferLog.transferred_at.desc()
    ).all()

    return transfers

@router.get("/assets/{asset_id}/transfers")
def get_asset_transfer_history(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    transfers = db.query(
        AssetTransferLog
    ).filter(
        AssetTransferLog.asset_id == asset_id
    ).order_by(
        AssetTransferLog.transferred_at.desc()
    ).all()

    return transfers