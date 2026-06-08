from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from passlib.context import CryptContext

from app.database import SessionLocal

from app.models.user import User

from app.schemas.auth_schema import LoginRequest

from app.auth.auth_handler import create_access_token


router = APIRouter()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.post("/login")
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == credentials.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_valid = pwd_context.verify(
        credentials.password,
        user.pw_hash
    )

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        data={
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }