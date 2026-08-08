"""Asset return routes."""

from fastapi import APIRouter, Request

from app.auth.auth_bearer import AdminUser
from app.deps import AssetIdPath, DbSession
from app.schemas.transfer_schema import ReturnRequest, TransferResponse
from app.services import transfer_service

router = APIRouter(tags=["returns"])


@router.post("/return/{asset_id}", response_model=TransferResponse)
def return_asset(
    asset_id: AssetIdPath,
    payload: ReturnRequest,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Return an asset to inventory. Administrators only."""
    log = transfer_service.return_asset(
        db, asset_id, payload.remarks, current_user, request=request
    )
    return TransferResponse(**transfer_service.to_dict(log))
