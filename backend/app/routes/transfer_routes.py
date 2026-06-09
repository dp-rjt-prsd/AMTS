from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.user import User
from app.models.transfer_log import AssetTransferLog

from app.schemas.transfer_schema import TransferCreate, TransferResponse

from app.auth.auth_bearer import get_current_user, require_admin


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
    current_user: dict = Depends(require_admin)
):
    """Transfer asset to another user - Admin only"""

    try:

        # CHECK ASSET EXISTS
        asset = db.query(Asset).filter(
            Asset.asset_id == transfer.asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {transfer.asset_id} not found"
            )

        # CHECK RECEIVING USER EXISTS
        to_user = db.query(User).filter(
            User.user_id == transfer.to_user_id
        ).first()

        if not to_user:
            raise HTTPException(
                status_code=404,
                detail=f"User ID {transfer.to_user_id} not found"
            )

        old_holder = asset.current_holder_id
        asset.current_holder_id = transfer.to_user_id

        transfer_log = AssetTransferLog(
            asset_id=transfer.asset_id.upper(),
            from_user_id=old_holder,
            to_user_id=transfer.to_user_id,
            remarks=transfer.remarks
        )

        db.add(transfer_log)
        db.commit()

        return {
            "message": "Asset transferred successfully",
            "transfer_id": transfer_log.transfer_id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error during transfer"
        )


@router.get("/transfers")
def get_transfers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all asset transfers - Any authenticated user"""

    try:

        transfers = db.query(
            AssetTransferLog
        ).order_by(
            AssetTransferLog.transferred_at.desc()
        ).offset(skip).limit(limit).all()

        return transfers

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching transfers"
        )


@router.get("/assets/{asset_id}/transfers")
def get_asset_transfer_history(
    asset_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get transfer history for specific asset - Any authenticated user"""

    try:

        asset = db.query(Asset).filter(
            Asset.asset_id == asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {asset_id} not found"
            )

        transfers = db.query(
            AssetTransferLog
        ).filter(
            AssetTransferLog.asset_id == asset_id.upper()
        ).order_by(
            AssetTransferLog.transferred_at.desc()
        ).offset(skip).limit(limit).all()

        return transfers

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching transfer history"
        )