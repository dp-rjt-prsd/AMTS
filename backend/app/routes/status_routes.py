from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database import SessionLocal

from app.models.asset import Asset

from app.auth.auth_bearer import require_admin


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
    current_user: dict = Depends(require_admin)
):
    """Update asset status - Admin only"""

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