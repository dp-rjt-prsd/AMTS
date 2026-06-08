from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.auth.auth_bearer import get_current_user

from app.database import SessionLocal
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserResponse

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# DATABASE SESSION
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# CREATE USER
@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):

    # CHECK IF EMAIL EXISTS
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # HASH PASSWORD
    hashed_password = pwd_context.hash(user.password)

    # CREATE USER OBJECT
    new_user = User(
        emp_id=user.emp_id,
        name=user.name,
        email=user.email,
        pw_hash=hashed_password,
        role=user.role,
        dept_id=user.dept_id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.get("/protected")
def protected_route(
    current_user: dict = Depends(get_current_user)
):

    return {
        "message": "Protected route accessed",
        "user": current_user
    }

@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    users = db.query(User).all()

    return users