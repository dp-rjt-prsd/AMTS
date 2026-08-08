"""Authentication routes."""

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.auth.auth_bearer import AdminUser, CurrentUser
from app.auth.auth_handler import create_access_token
from app.config import settings
from app.deps import DbSession
from app.enums import AuditAction
from app.schemas.auth_schema import LoginRequest
from app.schemas.user_schema import LoginResponse, UserCreateAdmin, UserResponse
from app.security import limiter
from app.services import audit_service, user_service

logger = logging.getLogger("amts")

router = APIRouter(tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserCreateAdmin,
    db: DbSession,
    current_user: AdminUser,
    request: Request,
):
    """Create a user account. Administrators only; the first admin comes from seed.py."""
    user = user_service.create_user(
        db,
        payload,
        current_user,
        role=payload.role,
        request=request,
    )
    return user


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login(
    request: Request,
    credentials: LoginRequest,
    db: DbSession,
):
    """Exchange credentials for an access token."""
    user = user_service.authenticate(db, credentials.email, credentials.password)

    if user is None:
        # Deliberately identical for unknown-email and wrong-password.
        audit_service.record(
            db,
            action=AuditAction.LOGIN_FAILED,
            entity_type="user",
            entity_id=credentials.email,
            request=request,
        )
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        user_id=user.user_id,
        email=user.email,
        role=user.role.value,
        name=user.name,
    )

    audit_service.record(
        db,
        action=AuditAction.LOGIN_SUCCEEDED,
        entity_type="user",
        entity_id=user.user_id,
        actor={"user_id": user.user_id, "email": user.email},
        request=request,
    )
    db.commit()

    return LoginResponse(
        access_token=token,
        role=user.role,
        name=user.name,
        user_id=user.user_id,
    )


@router.get("/me", response_model=UserResponse)
def read_current_user(db: DbSession, current_user: CurrentUser):
    """Return the authenticated user's own profile."""
    return user_service.get_user_or_404(db, current_user["user_id"])
