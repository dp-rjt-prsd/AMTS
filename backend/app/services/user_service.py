"""User management logic."""

from functools import lru_cache
from typing import Optional, Sequence

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import AuditAction, Role
from app.models.department import Department
from app.models.user import User
from app.security import hash_password, verify_password
from app.services import audit_service


def list_users(
    db: Session,
    current_user: dict,
    *,
    skip: int = 0,
    limit: int = 200,
) -> Sequence[User]:
    """Admins see everyone; department heads see their own department."""
    stmt = select(User)

    if current_user.get("role") == Role.DEPARTMENT_HEAD.value:
        dept_id = db.execute(
            select(User.dept_id).where(User.user_id == current_user["user_id"])
        ).scalar_one_or_none()
        stmt = stmt.where(User.dept_id == dept_id) if dept_id else stmt.where(
            User.user_id == current_user["user_id"]
        )

    stmt = stmt.order_by(User.user_id).offset(skip).limit(limit)
    return db.execute(stmt).unique().scalars().all()


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    """A real bcrypt hash, computed once, used to equalise timing on the no-such-user path."""
    return hash_password("not-a-real-password")


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    """Return the user if the credentials are valid, else None."""
    user = db.execute(
        select(User).where(User.email == email)
    ).scalars().first()

    if user is None:
        # Spend the same time hashing as the real path, so login cannot
        # be used to enumerate valid email addresses.
        verify_password(password, _dummy_hash())
        return None

    if not verify_password(password, user.pw_hash):
        return None

    return user


def create_user(
    db: Session,
    payload,
    current_user: Optional[dict] = None,
    *,
    role: Role = Role.EMPLOYEE,
    request: Optional[Request] = None,
) -> User:
    """Create a user. Role is a keyword argument, never read from a request body."""
    existing = db.execute(
        select(User).where(
            (User.email == payload.email) | (User.emp_id == payload.emp_id)
        )
    ).scalars().first()

    if existing is not None:
        field = "Email" if existing.email == payload.email else "Employee ID"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{field} is already registered",
        )

    if payload.dept_id is not None and db.get(Department, payload.dept_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department {payload.dept_id} does not exist",
        )

    user = User(
        emp_id=payload.emp_id,
        name=payload.name,
        email=payload.email,
        pw_hash=hash_password(payload.password),
        role=role,
        dept_id=payload.dept_id,
    )
    db.add(user)
    db.flush()

    audit_service.record(
        db,
        action=AuditAction.USER_CREATED,
        entity_type="user",
        entity_id=user.user_id,
        actor=current_user,
        after={"email": user.email, "role": role.value, "dept_id": user.dept_id},
        request=request,
    )

    db.commit()
    db.refresh(user)
    return user


def change_role(
    db: Session,
    user_id: int,
    new_role: Role,
    current_user: dict,
    request: Optional[Request] = None,
) -> User:
    user = get_user_or_404(db, user_id)

    if user.user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    if user.role == Role.ADMIN and new_role != Role.ADMIN:
        remaining_admins = db.execute(
            select(User).where(User.role == Role.ADMIN).where(User.user_id != user_id)
        ).scalars().first()

        if remaining_admins is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot demote the last remaining administrator",
            )

    before = user.role.value if hasattr(user.role, "value") else str(user.role)
    user.role = new_role

    audit_service.record(
        db,
        action=AuditAction.USER_ROLE_CHANGED,
        entity_type="user",
        entity_id=user.user_id,
        actor=current_user,
        before={"role": before},
        after={"role": new_role.value},
        request=request,
    )

    db.commit()
    db.refresh(user)
    return user
