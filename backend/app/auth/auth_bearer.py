from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.auth_handler import verify_token


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Extract and verify current user from token"""
    token = credentials.credentials

    payload = verify_token(token)

    if payload is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return payload


def require_admin(
    current_user: dict = Depends(get_current_user)
):
    """Dependency to require ADMIN role"""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user


def require_department_head(
    current_user: dict = Depends(get_current_user)
):
    """Dependency to require DEPARTMENT_HEAD role"""
    if current_user.get("role") not in ["ADMIN", "DEPARTMENT_HEAD"]:
        raise HTTPException(
            status_code=403,
            detail="Department Head or Admin access required"
        )
    return current_user


def require_authenticated(
    current_user: dict = Depends(get_current_user)
):
    """Dependency to require any authenticated user"""
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    return current_user