from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth.auth_bearer import get_current_user, require_admin

from app.database import SessionLocal
from app.models.user import User
from app.schemas.user_schema import UserResponse

router = APIRouter()


# DATABASE SESSION
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/users", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Get all users - Admin only
    """
    users = db.query(User).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get specific user by ID - Any authenticated user can access their own profile
    """
    # Allow users to access their own profile or admins to access any profile
    if current_user.get("user_id") != user_id and current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this user"
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    return user