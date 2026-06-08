from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)

    emp_id = Column(String(50), unique=True)

    name = Column(String(100))

    email = Column(String(100), unique=True, nullable=False)

    pw_hash = Column(String(255), nullable=False)

    role = Column(String(20), nullable=False)

    dept_id = Column(Integer, ForeignKey("departments.dept_id"))

    created_at = Column(TIMESTAMP, server_default=func.now())