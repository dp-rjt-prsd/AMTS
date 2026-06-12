from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal

from app.models.asset import Asset
from app.models.asset_type import AssetType
from app.models.asset_status import AssetStatus
from app.models.user import User

from app.schemas.asset_schema import (
    AssetCreate,
    AssetResponse
)

from app.auth.auth_bearer import get_current_user, require_admin

from app.utils.qr_handler import generate_qr_code_base64


router = APIRouter()


class ScanRequest(BaseModel):
    asset_id: str

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# GET ASSET TYPES

@router.get("/asset-types")
def get_asset_types(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all asset types - auto seed if empty and ensure required categories"""
    types = db.query(AssetType).all()
    
    # Dynamically find the correct column names from the SQLAlchemy model
    try:
        columns = AssetType.__table__.columns.keys()
        id_col = next((c for c in columns if c.endswith("id")), columns[0])
        name_col = next((c for c in columns if "name" in c or "desc" in c or "type" in c and c != id_col), columns[1] if len(columns) > 1 else columns[0])
    except Exception:
        id_col = "asset_type_id"
        name_col = "asset_type_name"
        
    expected_names = ["IT", "Furniture", "Misc", "Appliances"]
    current_names = {getattr(t, name_col) for t in types if getattr(t, name_col)}
    
    missing = [name for name in expected_names if name not in current_names]
    if missing:
        try:
            for name in missing:
                db.add(AssetType(**{name_col: name}))
            db.commit()
            types = db.query(AssetType).all()
        except Exception:
            db.rollback()
            types = db.query(AssetType).all()
            
    return [
        {
            "asset_type_id": getattr(t, id_col, i),
            "asset_type_name": getattr(t, name_col) or "Unknown"
        }
        for i, t in enumerate(types, 1)
    ]


# GET ASSET STATUSES

@router.get("/asset-statuses")
def get_asset_statuses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all asset statuses - auto seed if empty"""
    statuses = db.query(AssetStatus).all()
    
    try:
        columns = AssetStatus.__table__.columns.keys()
        id_col = next((c for c in columns if c.endswith("id")), columns[0])
        name_col = next((c for c in columns if "name" in c or "desc" in c or "status" in c and c != id_col), columns[1] if len(columns) > 1 else columns[0])
    except Exception:
        id_col = "status_id"
        name_col = "status_name"

    current_names = {getattr(s, name_col) for s in statuses if getattr(s, name_col)}
    
    if not current_names:
        try:
            default_names = ["Available", "Assigned", "Repair", "Retired"]
            for name in default_names:
                db.add(AssetStatus(**{name_col: name}))
            db.commit()
            statuses = db.query(AssetStatus).all()
        except Exception:
            db.rollback()
            statuses = db.query(AssetStatus).all()
            
    return [
        {
            "status_id": getattr(s, id_col, i),
            "status_name": getattr(s, name_col) or "Unknown"
        }
        for i, s in enumerate(statuses, 1)
    ]


# CREATE ASSET - ADMIN ONLY

@router.post("/assets")
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
        )
        
        # Safely assign qr_code if the column exists in the database schema
        if hasattr(new_asset, 'qr_code'):
            new_asset.qr_code = qr_code

        db.add(new_asset)
        db.commit()

        # Return exactly what the frontend QR modal needs to avoid serialization crashes
        return {
            "asset_id": new_asset.asset_id,
            "asset_name": new_asset.asset_name,
            "qr_code": qr_code
        }

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
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all assets - Any authenticated user"""

    try:

        assets = db.query(Asset).offset(skip).limit(limit).all()
            
        # Fetch users to map IDs to names
        users = {u.user_id: u.name for u in db.query(User).all()}
            
        # Fetch statuses to map IDs to names
        statuses = db.query(AssetStatus).all()
        status_map = {}
        for s in statuses:
                try:
                    cols = AssetStatus.__table__.columns.keys()
                    name_col = next((c for c in cols if "name" in c or "desc" in c or "status" in c and not c.endswith("id")), cols[1] if len(cols) > 1 else cols[0])
                    id_col = next((c for c in cols if c.endswith("id")), cols[0])
                    status_map[getattr(s, id_col)] = getattr(s, name_col, "Unknown")
                except Exception:
                    status_map[getattr(s, "status_id", s.id)] = getattr(s, "status_name", "Unknown")
                    
        # Fetch asset types to map IDs to names
        types = db.query(AssetType).all()
        type_map = {}
        for t in types:
                try:
                    cols = AssetType.__table__.columns.keys()
                    name_col = next((c for c in cols if "name" in c or "desc" in c or "type" in c and not c.endswith("id")), cols[1] if len(cols) > 1 else cols[0])
                    id_col = next((c for c in cols if c.endswith("id")), cols[0])
                    type_map[getattr(t, id_col)] = getattr(t, name_col, "Unknown")
                except Exception:
                    type_map[getattr(t, "asset_type_id", t.id)] = getattr(t, "asset_type_name", "Unknown")

        return [
                {
                    "asset_id": asset.asset_id,
                    "asset_name": asset.asset_name,
                    "procurement_by": getattr(asset, "procurement_by", None),
                    "purchase_order_id": getattr(asset, "purchase_order_id", None),
                    "asset_type_id": asset.asset_type_id,
                    "asset_type_name": type_map.get(asset.asset_type_id, "Unknown"),
                    "status_id": asset.status_id,
                    "status_name": status_map.get(asset.status_id, "Unknown"),
                    "current_holder_id": asset.current_holder_id,
                    "holder_name": users.get(asset.current_holder_id, "-"),
                    "serial_number": getattr(asset, "serial_number", None),
                    "price": getattr(asset, "price", 0),
                    "remarks": getattr(asset, "remarks", None)
                }
                for asset in assets
            ]

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
            
        # Ensure qr_code is always generated and attached for external pages (like asset_details)
        qr_code = generate_qr_code_base64(asset.asset_id.upper())

        # Fetch readable names for relationships
        holder = db.query(User).filter(User.user_id == asset.current_holder_id).first() if asset.current_holder_id else None
        
        status_name = "Unknown"
        status = db.query(AssetStatus).filter(AssetStatus.status_id == asset.status_id).first() if asset.status_id else None
        if status:
            columns = AssetStatus.__table__.columns.keys()
            name_col = next((c for c in columns if "name" in c or "desc" in c or "status" in c and not c.endswith("id")), columns[1] if len(columns) > 1 else columns[0])
            status_name = getattr(status, name_col, "Unknown")
            
        type_name = "Unknown"
        asset_type = db.query(AssetType).filter(AssetType.asset_type_id == asset.asset_type_id).first() if asset.asset_type_id else None
        if asset_type:
            columns = AssetType.__table__.columns.keys()
            name_col = next((c for c in columns if "name" in c or "desc" in c or "type" in c and not c.endswith("id")), columns[1] if len(columns) > 1 else columns[0])
            type_name = getattr(asset_type, name_col, "Unknown")

        return {
            "asset_id": asset.asset_id,
            "asset_name": asset.asset_name,
            "procurement_by": getattr(asset, "procurement_by", None),
            "purchase_order_id": getattr(asset, "purchase_order_id", None),
            "asset_type_id": asset.asset_type_id,
            "asset_type_name": type_name,
            "status_id": asset.status_id,
            "status_name": status_name,
            "current_holder_id": asset.current_holder_id,
            "holder_name": holder.name if holder else "-",
            "serial_number": getattr(asset, "serial_number", None),
            "price": getattr(asset, "price", 0),
            "remarks": getattr(asset, "remarks", None),
            "qr_code": qr_code
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error fetching asset"
        )


# RETIRE ASSET - ADMIN ONLY

@router.put("/assets/{asset_id}/retire")
def retire_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Retire specific asset - Admin only"""
    try:
        asset = db.query(Asset).filter(Asset.asset_id == asset_id.upper()).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
            
        try:
            columns = AssetStatus.__table__.columns.keys()
            id_col = next((c for c in columns if c.endswith("id")), columns[0])
            name_col = next((c for c in columns if "name" in c or "desc" in c or "status" in c and c != id_col), columns[1] if len(columns) > 1 else columns[0])
        except Exception:
            id_col = "status_id"
            name_col = "status_name"

        retired_status = db.query(AssetStatus).filter(getattr(AssetStatus, name_col).ilike("retired")).first()
        if not retired_status:
            raise HTTPException(status_code=500, detail="'Retired' status not found in database")
            
        asset.status_id = getattr(retired_status, id_col)
        asset.current_holder_id = None
        db.commit()
        return {"success": True, "message": f"Asset {asset_id} retired successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Cannot retire asset.")


# DELETE ASSET - ADMIN ONLY

@router.delete("/assets/{asset_id}")
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete specific asset - Admin only"""
    try:
        asset = db.query(Asset).filter(Asset.asset_id == asset_id.upper()).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
            
        db.delete(asset)
        db.commit()
        return {"success": True, "message": f"Asset {asset_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Cannot delete asset. Ensure dependent records (like transfers or repairs) are removed first.")


# SCAN QR CODE - CHECKOUT ASSET

@router.post("/scan")
def scan_qr_code(
    payload: ScanRequest,
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
            Asset.asset_id == payload.asset_id.upper()
        ).first()

        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {payload.asset_id} not found"
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