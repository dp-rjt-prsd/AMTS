from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.asset_type import AssetType
from app.models.asset_status import AssetStatus

from app.schemas.asset_schema import (
    AssetCreate,
    AssetResponse
)

from app.auth.auth_bearer import get_current_user, require_admin

from app.utils.qr_handler import generate_qr_code_base64


router = APIRouter()


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# CREATE ASSET - ADMIN ONLY

@router.post("/assets", response_model=AssetResponse)
def create_asset(
    asset: AssetCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new asset - Admin only"""

    try:

        # CHECK IF ASSET EXISTS
        existing_asset = db.query(Asset).filter(
            Asset.asset_id == asset.asset_id.upper()
        ).first()

        if existing_asset:
            raise HTTPException(
                status_code=400,
                detail="Asset ID already exists"
            )

        # VALIDATE ASSET TYPE EXISTS
        asset_type = db.query(AssetType).filter(
            AssetType.asset_type_id == asset.asset_type_id
        ).first()

        if not asset_type:
            raise HTTPException(
                status_code=400,
                detail=f"Asset type ID {asset.asset_type_id} does not exist"
            )

        # VALIDATE STATUS EXISTS
        status = db.query(AssetStatus).filter(
            AssetStatus.status_id == asset.status_id
        ).first()

        if not status:
            raise HTTPException(
                status_code=400,
                detail=f"Status ID {asset.status_id} does not exist"
            )

        # GENERATE QR CODE
        qr_code = generate_qr_code_base64(asset.asset_id.upper())

        new_asset = Asset(
            asset_id=asset.asset_id.upper(),
            procurement_by=asset.procurement_by,
            purchase_order_id=asset.purchase_order_id,
            asset_name=asset.asset_name,
            asset_type_id=asset.asset_type_id,
            status_id=asset.status_id,
            current_holder_id=asset.current_holder_id,
            serial_number=asset.serial_number,
            price=asset.price,
            remarks=asset.remarks,
            qr_code=qr_code
        )

        db.add(new_asset)
        db.commit()
        db.refresh(new_asset)

        return new_asset

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Database integrity error - check foreign keys"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating asset: {str(e)}"
        )


# GET ALL ASSETS - AUTHENTICATED USERS

@router.get("/assets")
def get_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all assets - Any authenticated user"""

    try:

        assets = db.query(Asset).offset(skip).limit(limit).all()
        return assets

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching assets"
        )


# GET SINGLE ASSET - AUTHENTICATED USERS

@router.get("/assets/{asset_id}")
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific asset - Any authenticated user"""

    try:

        asset = db.query(Asset).filter(
            Asset.asset_id == asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {asset_id} not found"
            )

        return asset

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching asset"
        )


# SCAN QR CODE - CHECKOUT ASSET

@router.post("/scan")
def scan_qr_code(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Scan QR code and checkout asset to current user
    - Any authenticated user
    """

    try:

        # FIND ASSET
        asset = db.query(Asset).filter(
            Asset.asset_id == asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {asset_id} not found"
            )

        # UPDATE ASSET HOLDER
        asset.current_holder_id = current_user["user_id"]

        db.add(asset)
        db.commit()
        db.refresh(asset)

        return {
            "success": True,
            "message": f"Asset {asset.asset_id} checked out to {current_user['name']}",
            "asset": {
                "asset_id": asset.asset_id,
                "asset_name": asset.asset_name,
                "holder_name": current_user["name"]
            }
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error scanning QR code: {str(e)}"
        )