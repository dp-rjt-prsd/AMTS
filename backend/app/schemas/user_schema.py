from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    emp_id: Optional[str] = None
    name: Optional[str] = None
    email: EmailStr
    password: str
    role: str
    dept_id: Optional[int] = None


class UserResponse(BaseModel):
    user_id: int
    emp_id: Optional[str]
    name: Optional[str]
    email: str
    role: str

    class Config:
        from_attributes = True