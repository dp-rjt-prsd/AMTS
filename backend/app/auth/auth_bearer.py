"""Authentication and role-based authorisation dependencies."""

from typing import Annotated, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.auth_handler import TokenExpired, TokenInvalid, verify_token
from app.enums import Role

security = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Resolve the caller from their bearer token."""
    try:
        return verify_token(credentials.credentials)
    except TokenExpired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenInvalid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


CurrentUser = Annotated[dict, Depends(get_current_user)]


def require_roles(*allowed: Role) -> Callable[[dict], dict]:
    """Build a dependency that admits only the given roles."""
    allowed_values = {r.value for r in allowed}

    def dependency(current_user: CurrentUser) -> dict:
        if current_user.get("role") not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency


require_admin = require_roles(Role.ADMIN)
require_department_head = require_roles(Role.ADMIN, Role.DEPARTMENT_HEAD)

AdminUser = Annotated[dict, Depends(require_admin)]
DepartmentHeadUser = Annotated[dict, Depends(require_department_head)]
