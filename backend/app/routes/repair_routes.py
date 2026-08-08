"""Repair routes."""

from fastapi import APIRouter, Query, Request, status

from app.auth.auth_bearer import AdminUser, CurrentUser
from app.deps import AssetIdPath, DbSession
from app.schemas.repair_schema import RepairCreate, RepairResponse
from app.services import asset_service, repair_service

router = APIRouter(tags=["repairs"])


@router.post(
    "/repair/{asset_id}",
    response_model=RepairResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_for_repair(
    asset_id: AssetIdPath,
    payload: RepairCreate,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Open a repair for an asset. Administrators only."""
    log = repair_service.open_repair(
        db, asset_id, payload.issue_description, current_user, request=request
    )
    return RepairResponse(**repair_service.to_dict(log))


@router.put("/repair/{repair_id}/return", response_model=RepairResponse)
def return_from_repair(
    repair_id: int,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Close a repair. Administrators only."""
    log = repair_service.close_repair(db, repair_id, current_user, request=request)
    return RepairResponse(**repair_service.to_dict(log))


@router.get("/repair/logs", response_model=list[RepairResponse])
def list_repair_logs(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    logs = repair_service.list_repairs(db, current_user, skip=skip, limit=limit)
    return [RepairResponse(**repair_service.to_dict(r)) for r in logs]


@router.get("/assets/{asset_id}/repairs", response_model=list[RepairResponse])
def asset_repair_history(
    asset_id: AssetIdPath,
    db: DbSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    asset_service.get_visible_asset_or_404(db, asset_id, current_user)

    logs = repair_service.list_repairs(
        db, current_user, skip=skip, limit=limit, asset_id=asset_id
    )
    return [RepairResponse(**repair_service.to_dict(r)) for r in logs]
