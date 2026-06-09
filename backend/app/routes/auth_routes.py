from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import SessionLocal
from app.models.user import User
from app.schemas.auth_schema import LoginRequest
from app.schemas.user_schema import UserCreate, UserResponse
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


@router.post("/register", response_model=UserResponse)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    
    - **emp_id**: Employee ID (required, 3-50 chars)
    - **name**: Full name (required, 2-100 chars)
    - **email**: User email (required)
    - **password**: Password (required, min 8 chars)
    - **role**: User role (ADMIN, DEPARTMENT_HEAD, NORMAL_USER) - defaults to NORMAL_USER
    - **dept_id**: Department ID (optional)
    """
    
    # CHECK IF EMAIL EXISTS
    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # CHECK IF EMP_ID EXISTS
    existing_emp = db.query(User).filter(User.emp_id == user.emp_id).first()
    if existing_emp:
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists"
        )
    
    # VALIDATE ROLE
    valid_roles = ["ADMIN", "DEPARTMENT_HEAD", "NORMAL_USER"]
    if user.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # HASH PASSWORD
    hashed_password = pwd_context.hash(user.password)
    
    # CREATE USER
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


@router.post("/login")
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login user and return JWT token with user information
    
    - **email**: User email
    - **password**: User password
    """
    
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
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "user_id": user.user_id
    }