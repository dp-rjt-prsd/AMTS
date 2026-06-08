from sqlalchemy import Column, Integer, String
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    dept_id = Column(Integer, primary_key=True, index=True)

    dept_name = Column(String(100), unique=True, nullable=False)