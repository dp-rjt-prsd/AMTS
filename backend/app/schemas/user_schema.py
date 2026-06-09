from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    """Schema for user registration"""
    emp_id: str = Field(..., min_length=3, max_length=50, description="Employee ID")
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 chars)")
    role: str = Field("NORMAL_USER", description="User role: ADMIN, DEPARTMENT_HEAD, NORMAL_USER")
    dept_id: Optional[int] = Field(None, description="Department ID")

    class Config:
        json_schema_extra = {
            "example": {
                "emp_id": "EMP001",
                "name": "John Doe",
                "email": "john@example.com",
                "password": "SecurePass123",
                "role": "NORMAL_USER",
                "dept_id": 1
            }
        }


class UserResponse(BaseModel):
    """Schema for user response"""
    user_id: int
    emp_id: Optional[str]
    name: Optional[str]
    email: str
    role: str
    dept_id: Optional[int]

    class Config:
        from_attributes = True