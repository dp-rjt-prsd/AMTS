"""Seed reference data and the bootstrap administrator.

Idempotent, so it is safe to run repeatedly.

Usage:
    python seed.py
"""

import sys

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.enums import AssetStatusName, Role
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.department import Department
from app.models.user import User
from app.security import hash_password

DEPARTMENTS = ["IT", "HR", "Finance", "Operations", "Administration"]

ASSET_TYPES = ["IT Equipment", "Furniture", "Vehicle", "Appliance", "Miscellaneous"]


def seed_departments(db: Session) -> None:
    existing = {d.dept_name for d in db.execute(select(Department)).scalars()}
    for name in DEPARTMENTS:
        if name not in existing:
            db.add(Department(dept_name=name))
    db.commit()
    print(f"  departments: {len(DEPARTMENTS)} ensured")


def seed_asset_types(db: Session) -> None:
    existing = {t.asset_type_name for t in db.execute(select(AssetType)).scalars()}
    for name in ASSET_TYPES:
        if name not in existing:
            db.add(AssetType(asset_type_name=name))
    db.commit()
    print(f"  asset types: {len(ASSET_TYPES)} ensured")


def seed_statuses(db: Session) -> None:
    """Seed the four statuses with pinned ids, so they survive a rebuild unchanged."""
    wanted = {
        1: AssetStatusName.AVAILABLE,
        2: AssetStatusName.ASSIGNED,
        3: AssetStatusName.REPAIR,
        4: AssetStatusName.RETIRED,
    }

    existing = {s.status_id: s for s in db.execute(select(AssetStatus)).scalars()}

    for status_id, name in wanted.items():
        if status_id not in existing:
            db.add(AssetStatus(status_id=status_id, status_name=name.value))
        elif existing[status_id].status_name != name.value:
            existing[status_id].status_name = name.value

    db.commit()
    print(f"  statuses: {len(wanted)} ensured")


def seed_admin(db: Session) -> None:
    email = settings.BOOTSTRAP_ADMIN_EMAIL
    password = settings.BOOTSTRAP_ADMIN_PASSWORD
    name = settings.BOOTSTRAP_ADMIN_NAME
    emp_id = settings.BOOTSTRAP_ADMIN_EMP_ID

    existing_admin = db.execute(
        select(User).where(User.role == Role.ADMIN)
    ).scalars().first()

    if existing_admin is not None:
        print(f"  admin: already present ({existing_admin.email}) - skipped")
        return

    if not password:
        print(
            "  admin: BOOTSTRAP_ADMIN_PASSWORD is not set - skipped.\n"
            "         Set it in .env and re-run to create the first administrator.",
            file=sys.stderr,
        )
        return

    if len(password) < 12:
        print(
            "  admin: BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters - skipped.",
            file=sys.stderr,
        )
        return

    # This builds a User directly rather than through the Pydantic schema, so it
    # has to apply the same email rule the login endpoint will.
    try:
        validate_email(email, check_deliverability=False)
    except EmailNotValidError as exc:
        print(
            f"  admin: BOOTSTRAP_ADMIN_EMAIL ({email}) is not a usable address - skipped.\n"
            f"         {exc}\n"
            "         Avoid reserved domains like .local, .localhost, .test and .invalid.",
            file=sys.stderr,
        )
        return

    admin_dept = db.execute(
        select(Department).where(Department.dept_name == "Administration")
    ).scalars().first()

    db.add(
        User(
            emp_id=emp_id,
            name=name,
            email=email,
            pw_hash=hash_password(password),
            role=Role.ADMIN,
            dept_id=admin_dept.dept_id if admin_dept else None,
        )
    )
    db.commit()
    print(f"  admin: created {email}")


def main() -> None:
    print("Seeding AMTS reference data...")
    with SessionLocal() as db:
        seed_departments(db)
        seed_asset_types(db)
        seed_statuses(db)
        seed_admin(db)
    print("Done.")


if __name__ == "__main__":
    main()
