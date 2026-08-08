"""Asset transfer routes."""

from fastapi import APIRouter, Query, Request, status

from app.auth.auth_bearer import AdminUser, CurrentUser
from app.deps import AssetIdPath, DbSession
from app.schemas.transfer_schema import TransferCreate, TransferResponse
from app.services import asset_service, transfer_service

router = APIRouter(tags=["transfers"])


@router.post(
    "/transfer",
    response_model=TransferResponse,
    status_code=status.HTTP_201_CREATED,
)
def transfer_asset(
    payload: TransferCreate,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Transfer an asset to another user. Administrators only."""
    log = transfer_service.transfer_asset(db, payload, current_user, request=request)
    return TransferResponse(**transfer_service.to_dict(log))


@router.get("/transfers", response_model=list[TransferResponse])
def list_transfers(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List transfers for assets the caller can see."""
    logs = transfer_service.list_transfers(db, current_user, skip=skip, limit=limit)
    return [TransferResponse(**transfer_service.to_dict(t)) for t in logs]


@router.get("/assets/{asset_id}/transfers", response_model=list[TransferResponse])
def asset_transfer_history(
    asset_id: AssetIdPath,
    db: DbSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    # Resolve visibility first, so an invisible asset 404s instead of returning [].
    asset_service.get_visible_asset_or_404(db, asset_id, current_user)

    logs = transfer_service.list_transfers(
        db, current_user, skip=skip, limit=limit, asset_id=asset_id
    )
    return [TransferResponse(**transfer_service.to_dict(t)) for t in logs]
