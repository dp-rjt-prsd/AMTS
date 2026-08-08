"""Transfer and return logic."""

from typing import Optional, Sequence

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import AssetStatusName, AuditAction
from app.models.asset import Asset
from app.models.transfer_log import AssetTransferLog
from app.models.user import User
from app.services import asset_service, audit_service


def to_dict(log: AssetTransferLog) -> dict:
    return {
        "transfer_id": log.transfer_id,
        "asset_id": log.asset_id,
        "from_user_id": log.from_user_id,
        "to_user_id": log.to_user_id,
        "from_user_name": log.from_user.name if log.from_user else None,
        "to_user_name": log.to_user.name if log.to_user else None,
        "performed_by_id": log.performed_by_id,
        "performed_by_name": log.performed_by.name if log.performed_by else None,
        "remarks": log.remarks,
        "transferred_at": log.transferred_at,
    }


def list_transfers(
    db: Session,
    current_user: dict,
    *,
    skip: int = 0,
    limit: int = 50,
    asset_id: Optional[str] = None,
) -> Sequence[AssetTransferLog]:
    """List transfers, restricted to assets the caller can see."""
    visible_assets = select(Asset.asset_id)
    clause = asset_service.visibility_clause(db, current_user)
    if clause is not None:
        visible_assets = visible_assets.where(clause)

    stmt = select(AssetTransferLog).where(
        AssetTransferLog.asset_id.in_(visible_assets)
    )

    if asset_id is not None:
        stmt = stmt.where(AssetTransferLog.asset_id == asset_id)

    stmt = (
        stmt.order_by(AssetTransferLog.transferred_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return db.execute(stmt).unique().scalars().all()


def transfer_asset(
    db: Session,
    payload,
    current_user: dict,
    request: Optional[Request] = None,
) -> AssetTransferLog:
    asset = asset_service.get_asset_or_404(db, payload.asset_id)

    recipient = db.get(User, payload.to_user_id)
    if recipient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {payload.to_user_id} not found",
        )

    retired_id = asset_service.get_status_id(db, AssetStatusName.RETIRED)
    if asset.status_id == retired_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A retired asset cannot be transferred",
        )

    if asset.current_holder_id == payload.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset is already held by {recipient.name}",
        )

    previous_holder = asset.current_holder_id

    asset.current_holder_id = payload.to_user_id
    asset.status_id = asset_service.get_status_id(db, AssetStatusName.ASSIGNED)

    log = AssetTransferLog(
        asset_id=asset.asset_id,
        from_user_id=previous_holder,
        to_user_id=payload.to_user_id,
        performed_by_id=current_user["user_id"],
        remarks=payload.remarks,
    )
    db.add(log)

    audit_service.record(
        db,
        action=AuditAction.ASSET_TRANSFERRED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before={"current_holder_id": previous_holder},
        after={"current_holder_id": payload.to_user_id},
        request=request,
    )

    db.commit()
    db.refresh(log)
    return log


def return_asset(
    db: Session,
    asset_id: str,
    remarks: Optional[str],
    current_user: dict,
    request: Optional[Request] = None,
) -> AssetTransferLog:
    asset = asset_service.get_asset_or_404(db, asset_id)

    if asset.current_holder_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset {asset.asset_id} is not currently assigned to anyone",
        )

    previous_holder = asset.current_holder_id

    asset.current_holder_id = None
    asset.status_id = asset_service.get_status_id(db, AssetStatusName.AVAILABLE)

    log = AssetTransferLog(
        asset_id=asset.asset_id,
        from_user_id=previous_holder,
        to_user_id=None,
        performed_by_id=current_user["user_id"],
        remarks=f"Returned to inventory. {remarks}".strip() if remarks else "Returned to inventory",
    )
    db.add(log)

    audit_service.record(
        db,
        action=AuditAction.ASSET_RETURNED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before={"current_holder_id": previous_holder},
        after={"current_holder_id": None},
        request=request,
    )

    db.commit()
    db.refresh(log)
    return log
