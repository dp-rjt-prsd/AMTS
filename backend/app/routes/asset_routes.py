"""Asset routes."""

from fastapi import APIRouter, Query, Request, status

from app.auth.auth_bearer import AdminUser, CurrentUser
from app.deps import AssetIdPath, DbSession
from app.schemas.asset_schema import (
    AssetCreate,
    AssetDetailResponse,
    AssetResponse,
    AssetStatusResponse,
    AssetTypeResponse,
    ScanRequest,
)
from app.services import asset_service
from app.utils.qr_handler import generate_qr_code_base64

router = APIRouter(tags=["assets"])


@router.get("/asset-types", response_model=list[AssetTypeResponse])
def list_asset_types(db: DbSession, current_user: CurrentUser):
    return asset_service.list_asset_types(db)


@router.get("/asset-statuses", response_model=list[AssetStatusResponse])
def list_asset_statuses(db: DbSession, current_user: CurrentUser):
    return asset_service.list_asset_statuses(db)


@router.post(
    "/assets",
    response_model=AssetDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_asset(
    payload: AssetCreate,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Create an asset. Administrators only."""
    asset = asset_service.create_asset(db, payload, current_user, request=request)

    return AssetDetailResponse(
        **asset_service.to_dict(asset),
        qr_code=generate_qr_code_base64(asset.asset_id),
    )


@router.get("/assets", response_model=list[AssetResponse])
def list_assets(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List assets visible to the caller."""
    assets = asset_service.list_assets(db, current_user, skip=skip, limit=limit)
    return [AssetResponse(**asset_service.to_dict(a)) for a in assets]


@router.get("/assets/{asset_id}", response_model=AssetDetailResponse)
def get_asset(asset_id: AssetIdPath, db: DbSession, current_user: CurrentUser):
    asset = asset_service.get_visible_asset_or_404(db, asset_id, current_user)

    return AssetDetailResponse(
        **asset_service.to_dict(asset),
        qr_code=generate_qr_code_base64(asset.asset_id),
    )


@router.put("/assets/{asset_id}/retire", response_model=AssetResponse)
def retire_asset(
    asset_id: AssetIdPath,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Retire an asset. Administrators only."""
    asset = asset_service.get_asset_or_404(db, asset_id)
    asset = asset_service.retire_asset(db, asset, current_user, request=request)
    return AssetResponse(**asset_service.to_dict(asset))


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: AssetIdPath,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Delete an asset. Dependent log rows make this a 409 via the global handler."""
    asset = asset_service.get_asset_or_404(db, asset_id)
    asset_service.delete_asset(db, asset, current_user, request=request)


@router.post("/scan", response_model=AssetDetailResponse)
def scan_qr_code(
    payload: ScanRequest,
    db: DbSession,
    current_user: CurrentUser,
    request: Request,
):
    """Check out a scanned asset to the current user."""
    asset = asset_service.scan_checkout(
        db, payload.asset_id, current_user, request=request
    )

    return AssetDetailResponse(
        **asset_service.to_dict(asset),
        qr_code=generate_qr_code_base64(asset.asset_id),
    )
