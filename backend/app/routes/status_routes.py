"""Asset status routes."""

from fastapi import APIRouter, Request

from app.auth.auth_bearer import AdminUser
from app.deps import AssetIdPath, DbSession
from app.schemas.asset_schema import AssetResponse, AssetStatusUpdate
from app.services import asset_service

router = APIRouter(tags=["assets"])


@router.put("/assets/{asset_id}/status", response_model=AssetResponse)
def update_asset_status(
    asset_id: AssetIdPath,
    payload: AssetStatusUpdate,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Update an asset's status. Administrators only."""
    asset = asset_service.get_asset_or_404(db, asset_id)
    asset = asset_service.update_status(
        db, asset, payload.status_id, current_user, request=request
    )
    return AssetResponse(**asset_service.to_dict(asset))
