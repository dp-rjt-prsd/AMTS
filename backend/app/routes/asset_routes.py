from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database import SessionLocal

from app.models.asset import Asset

from app.schemas.asset_schema import (
    AssetCreate,
    AssetResponse
)

from app.auth.auth_bearer import get_current_user


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# CREATE ASSET

@router.post("/assets", response_model=AssetResponse)
def create_asset(
    asset: AssetCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # OPTIONAL ADMIN CHECK

    if current_user["role"] != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Only admins can create assets"
        )

    existing_asset = db.query(Asset).filter(
        Asset.asset_id == asset.asset_id
    ).first()

    if existing_asset:

        raise HTTPException(
            status_code=400,
            detail="Asset ID already exists"
        )

    new_asset = Asset(
        asset_id=asset.asset_id,
        procurement_by=asset.procurement_by,
        purchase_order_id=asset.purchase_order_id,
        asset_name=asset.asset_name,
        asset_type_id=asset.asset_type_id,
        status_id=asset.status_id,
        current_holder_id=asset.current_holder_id,
        serial_number=asset.serial_number,
        price=asset.price,
        remarks=asset.remarks
    )

    db.add(new_asset)

    db.commit()

    db.refresh(new_asset)

    return new_asset


# GET ALL ASSETS

@router.get("/assets")
def get_assets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    assets = db.query(Asset).all()

    return assets


# GET SINGLE ASSET

@router.get("/assets/{asset_id}")
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    asset = db.query(Asset).filter(
        Asset.asset_id == asset_id
    ).first()

    if not asset:

        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return asset