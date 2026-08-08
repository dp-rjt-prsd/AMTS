"""Repair lifecycle logic."""

from datetime import datetime, timezone
from typing import Optional, Sequence

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import AssetStatusName, AuditAction
from app.models.asset import Asset
from app.models.repair_log import RepairLog
from app.services import asset_service, audit_service


def to_dict(log: RepairLog) -> dict:
    return {
        "repair_id": log.repair_id,
        "asset_id": log.asset_id,
        "issue_description": log.issue_description,
        "sent_at": log.sent_at,
        "returned_at": log.returned_at,
        "opened_by_id": log.opened_by_id,
        "opened_by_name": log.opened_by.name if log.opened_by else None,
        "closed_by_id": log.closed_by_id,
        "closed_by_name": log.closed_by.name if log.closed_by else None,
    }


def list_repairs(
    db: Session,
    current_user: dict,
    *,
    skip: int = 0,
    limit: int = 50,
    asset_id: Optional[str] = None,
) -> Sequence[RepairLog]:
    visible_assets = select(Asset.asset_id)
    clause = asset_service.visibility_clause(db, current_user)
    if clause is not None:
        visible_assets = visible_assets.where(clause)

    stmt = select(RepairLog).where(RepairLog.asset_id.in_(visible_assets))

    if asset_id is not None:
        stmt = stmt.where(RepairLog.asset_id == asset_id)

    stmt = stmt.order_by(RepairLog.repair_id.desc()).offset(skip).limit(limit)
    return db.execute(stmt).unique().scalars().all()


def open_repair(
    db: Session,
    asset_id: str,
    issue_description: str,
    current_user: dict,
    request: Optional[Request] = None,
) -> RepairLog:
    asset = asset_service.get_asset_or_404(db, asset_id)

    retired_id = asset_service.get_status_id(db, AssetStatusName.RETIRED)
    if asset.status_id == retired_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A retired asset cannot be sent for repair",
        )

    existing_open = db.execute(
        select(RepairLog)
        .where(RepairLog.asset_id == asset.asset_id)
        .where(RepairLog.returned_at.is_(None))
    ).scalars().first()

    if existing_open is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Asset {asset.asset_id} already has an open repair "
                f"(#{existing_open.repair_id})"
            ),
        )

    before_status = asset.status_id
    asset.status_id = asset_service.get_status_id(db, AssetStatusName.REPAIR)

    log = RepairLog(
        asset_id=asset.asset_id,
        issue_description=issue_description,
        opened_by_id=current_user["user_id"],
    )
    db.add(log)

    audit_service.record(
        db,
        action=AuditAction.REPAIR_OPENED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before={"status_id": before_status},
        after={"status_id": asset.status_id, "issue": issue_description},
        request=request,
    )

    db.commit()
    db.refresh(log)
    return log


def close_repair(
    db: Session,
    repair_id: int,
    current_user: dict,
    request: Optional[Request] = None,
) -> RepairLog:
    log = db.get(RepairLog, repair_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repair record {repair_id} not found",
        )

    if log.returned_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This asset has already been returned from repair",
        )

    log.returned_at = datetime.now(timezone.utc)
    log.closed_by_id = current_user["user_id"]

    asset = db.get(Asset, log.asset_id)
    if asset is not None:
        # An asset keeps its holder while in repair, so it returns to Assigned.
        target = (
            AssetStatusName.ASSIGNED
            if asset.current_holder_id is not None
            else AssetStatusName.AVAILABLE
        )
        asset.status_id = asset_service.get_status_id(db, target)

    audit_service.record(
        db,
        action=AuditAction.REPAIR_CLOSED,
        entity_type="asset",
        entity_id=log.asset_id,
        actor=current_user,
        after={"repair_id": repair_id},
        request=request,
    )

    db.commit()
    db.refresh(log)
    return log
