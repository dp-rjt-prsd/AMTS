"""User routes."""

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import select

from app.auth.auth_bearer import AdminUser, CurrentUser, DepartmentHeadUser
from app.deps import DbSession
from app.enums import Role
from app.models.department import Department
from app.schemas.user_schema import DepartmentResponse, RoleUpdate, UserResponse
from app.services import user_service

router = APIRouter(tags=["users"])


@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments(db: DbSession, current_user: CurrentUser):
    return db.execute(select(Department).order_by(Department.dept_name)).scalars().all()


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: DbSession,
    current_user: DepartmentHeadUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    """Admins see everyone; department heads see their own department."""
    return user_service.list_users(db, current_user, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: DbSession, current_user: CurrentUser):
    """Fetch your own profile, or any profile if admin."""
    if current_user["user_id"] != user_id and current_user.get("role") != Role.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to view this user",
        )

    return user_service.get_user_or_404(db, user_id)


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: int,
    payload: RoleUpdate,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Change a user's role. Kept separate from creation so granting privilege is always explicit."""
    return user_service.change_role(
        db, user_id, payload.role, current_user, request=request
    )
