from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database import SessionLocal

from app.models.asset import Asset

from app.auth.auth_bearer import get_current_user


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.put("/assets/{asset_id}/status")
def update_asset_status(
    asset_id: str,
    status_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Only admins can update asset status"
        )

    asset = db.query(Asset).filter(
        Asset.asset_id == asset_id
    ).first()

    if not asset:

        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    asset.status_id = status_id

    db.commit()

    return {
        "message": "Asset status updated successfully"
    }