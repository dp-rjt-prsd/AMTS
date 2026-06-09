from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.transfer_log import AssetTransferLog

from app.auth.auth_bearer import require_admin


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.post("/return/{asset_id}")
def return_asset(
    asset_id: str,
    remarks: str = "",
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Return asset to inventory - Admin only"""

    asset = db.query(Asset).filter(
        Asset.asset_id == asset_id
    ).first()

    if not asset:

        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    previous_holder = asset.current_holder_id

    # REMOVE HOLDER

    asset.current_holder_id = None

    # SET STATUS TO AVAILABLE

    asset.status_id = 1

    # CREATE RETURN LOG

    transfer_log = AssetTransferLog(
        asset_id=asset.asset_id,
        from_user_id=previous_holder,
        to_user_id=None,
        remarks=f"Asset returned. {remarks}"
    )

    db.add(transfer_log)

    db.commit()

    return {
        "message": "Asset returned successfully"
    }