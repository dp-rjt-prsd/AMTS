"""Asset lookup, visibility scoping and lifecycle transitions."""

from typing import Optional, Sequence

from fastapi import HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, aliased

from app.enums import AssetStatusName, AuditAction, Role
from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.transfer_log import AssetTransferLog
from app.models.user import User
from app.services import audit_service


def get_status_id(db: Session, name: AssetStatusName) -> int:
    """Resolve a status name to its id, so no caller needs a hardcoded number."""
    status_row = db.execute(
        select(AssetStatus).where(AssetStatus.status_name == name.value)
    ).scalar_one_or_none()

    if status_row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reference data missing: status '{name.value}' is not seeded",
        )
    return status_row.status_id


def list_asset_types(db: Session) -> Sequence[AssetType]:
    return db.execute(
        select(AssetType).order_by(AssetType.asset_type_name)
    ).scalars().all()


def list_asset_statuses(db: Session) -> Sequence[AssetStatus]:
    return db.execute(
        select(AssetStatus).order_by(AssetStatus.status_id)
    ).scalars().all()


def visibility_clause(db: Session, current_user: dict):
    """Row filter for what this caller may see.

    Admin sees everything; a department head sees assets held by their
    department; an employee sees their own. Unassigned assets are visible to
    everyone, since they are the pool people check out from.

    The department is read from the database, not the token, so a user moved
    between departments does not keep stale visibility until their token expires.
    """
    role = current_user.get("role")

    if role == Role.ADMIN.value:
        return None

    if role == Role.DEPARTMENT_HEAD.value:
        dept_id = db.execute(
            select(User.dept_id).where(User.user_id == current_user["user_id"])
        ).scalar_one_or_none()

        if dept_id is None:
            return or_(
                Asset.current_holder_id.is_(None),
                Asset.current_holder_id == current_user["user_id"],
            )

        holder = aliased(User)
        dept_holders = select(holder.user_id).where(holder.dept_id == dept_id)
        return or_(
            Asset.current_holder_id.is_(None),
            Asset.current_holder_id.in_(dept_holders),
        )

    return or_(
        Asset.current_holder_id.is_(None),
        Asset.current_holder_id == current_user["user_id"],
    )


def list_assets(
    db: Session,
    current_user: dict,
    *,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Asset]:
    stmt = select(Asset)

    clause = visibility_clause(db, current_user)
    if clause is not None:
        stmt = stmt.where(clause)

    stmt = stmt.order_by(Asset.asset_id).offset(skip).limit(limit)
    return db.execute(stmt).unique().scalars().all()


def get_asset_or_404(db: Session, asset_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset {asset_id} not found",
        )
    return asset


def get_visible_asset_or_404(db: Session, asset_id: str, current_user: dict) -> Asset:
    """Fetch an asset, treating not-visible as not-found so 403 cannot confirm existence."""
    asset = get_asset_or_404(db, asset_id)

    clause = visibility_clause(db, current_user)
    if clause is None:
        return asset

    visible = db.execute(
        select(Asset.asset_id).where(Asset.asset_id == asset_id).where(clause)
    ).scalar_one_or_none()

    if visible is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset {asset_id} not found",
        )
    return asset


def to_dict(asset: Asset) -> dict:
    return {
        "asset_id": asset.asset_id,
        "asset_name": asset.asset_name,
        "procurement_by": asset.procurement_by,
        "purchase_order_id": asset.purchase_order_id,
        "asset_type_id": asset.asset_type_id,
        "asset_type_name": asset.asset_type.asset_type_name if asset.asset_type else None,
        "status_id": asset.status_id,
        "status_name": asset.status.status_name if asset.status else None,
        "current_holder_id": asset.current_holder_id,
        "holder_name": asset.current_holder.name if asset.current_holder else None,
        "serial_number": asset.serial_number,
        "price": asset.price,
        "remarks": asset.remarks,
        "created_at": asset.created_at,
    }


def create_asset(
    db: Session,
    payload,
    current_user: dict,
    request: Optional[Request] = None,
) -> Asset:
    if db.get(Asset, payload.asset_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset {payload.asset_id} already exists",
        )

    if db.get(AssetType, payload.asset_type_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset type {payload.asset_type_id} does not exist",
        )

    if db.get(AssetStatus, payload.status_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status {payload.status_id} does not exist",
        )

    if payload.current_holder_id is not None:
        if db.get(User, payload.current_holder_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {payload.current_holder_id} does not exist",
            )

    asset = Asset(**payload.model_dump())
    db.add(asset)

    audit_service.record(
        db,
        action=AuditAction.ASSET_CREATED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        after=to_dict(asset),
        request=request,
    )

    db.commit()
    db.refresh(asset)
    return asset


def update_status(
    db: Session,
    asset: Asset,
    new_status_id: int,
    current_user: dict,
    request: Optional[Request] = None,
) -> Asset:
    if db.get(AssetStatus, new_status_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status {new_status_id} does not exist",
        )

    before = {"status_id": asset.status_id}
    asset.status_id = new_status_id

    audit_service.record(
        db,
        action=AuditAction.ASSET_STATUS_CHANGED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before=before,
        after={"status_id": new_status_id},
        request=request,
    )

    db.commit()
    db.refresh(asset)
    return asset


def retire_asset(
    db: Session,
    asset: Asset,
    current_user: dict,
    request: Optional[Request] = None,
) -> Asset:
    retired_id = get_status_id(db, AssetStatusName.RETIRED)

    if asset.status_id == retired_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset {asset.asset_id} is already retired",
        )

    before = {"status_id": asset.status_id, "current_holder_id": asset.current_holder_id}

    asset.status_id = retired_id
    asset.current_holder_id = None

    audit_service.record(
        db,
        action=AuditAction.ASSET_RETIRED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before=before,
        after={"status_id": retired_id, "current_holder_id": None},
        request=request,
    )

    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(
    db: Session,
    asset: Asset,
    current_user: dict,
    request: Optional[Request] = None,
) -> None:
    snapshot = to_dict(asset)

    audit_service.record(
        db,
        action=AuditAction.ASSET_DELETED,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before=snapshot,
        request=request,
    )

    db.delete(asset)
    db.commit()


def scan_checkout(
    db: Session,
    asset_id: str,
    current_user: dict,
    request: Optional[Request] = None,
) -> Asset:
    """Check an asset out to the scanning user.

    A retired asset cannot be checked out, and one held by somebody else is
    refused rather than seized. Transfers between users go through the
    transfer endpoint.
    """
    asset = get_asset_or_404(db, asset_id)

    retired_id = get_status_id(db, AssetStatusName.RETIRED)
    if asset.status_id == retired_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset {asset.asset_id} is retired and cannot be checked out",
        )

    holder_id = asset.current_holder_id
    actor_id = current_user["user_id"]

    if holder_id is not None and holder_id != actor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This asset is currently assigned to another user. "
                "Ask an administrator to transfer it."
            ),
        )

    # Already theirs, so report success without a redundant log row.
    if holder_id == actor_id:
        return asset

    asset.current_holder_id = actor_id
    asset.status_id = get_status_id(db, AssetStatusName.ASSIGNED)

    db.add(
        AssetTransferLog(
            asset_id=asset.asset_id,
            from_user_id=None,
            to_user_id=actor_id,
            performed_by_id=actor_id,
            remarks="Self checkout via QR scan",
        )
    )

    audit_service.record(
        db,
        action=AuditAction.ASSET_SCANNED_OUT,
        entity_type="asset",
        entity_id=asset.asset_id,
        actor=current_user,
        before={"current_holder_id": None},
        after={"current_holder_id": actor_id},
        request=request,
    )

    db.commit()
    db.refresh(asset)
    return asset
