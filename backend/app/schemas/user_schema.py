from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.enums import Role


class UserCreate(BaseModel):
    """Fields for creating a user. Role is set by the server, never taken from the body."""

    emp_id: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    dept_id: Optional[int] = Field(None, ge=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "emp_id": "EMP002",
                "name": "Jane Doe",
                "email": "jane@example.gov",
                "password": "correct-horse-battery",
                "dept_id": 1,
            }
        }
    )


class UserCreateAdmin(UserCreate):
    """Admin-only creation, which may additionally set the role."""

    role: Role = Role.EMPLOYEE


class RoleUpdate(BaseModel):
    role: Role


class UserResponse(BaseModel):
    user_id: int
    emp_id: str
    name: str
    email: EmailStr
    role: Role
    dept_id: Optional[int]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class DepartmentResponse(BaseModel):
    dept_id: int
    dept_name: str

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    name: str
    user_id: int
