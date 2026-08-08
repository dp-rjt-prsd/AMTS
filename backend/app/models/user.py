from sqlalchemy import Column, Enum, ForeignKey, Index, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.enums import Role


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)

    emp_id = Column(String(50), unique=True, nullable=False)

    name = Column(String(100), nullable=False)

    email = Column(String(100), unique=True, nullable=False)

    pw_hash = Column(String(255), nullable=False)

    role = Column(
        Enum(Role, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=Role.EMPLOYEE,
    )

    dept_id = Column(Integer, ForeignKey("departments.dept_id"), index=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    department = relationship("Department", lazy="joined")

    __table_args__ = (
        # Department scoping filters on both together.
        Index("ix_users_dept_role", "dept_id", "role"),
    )
