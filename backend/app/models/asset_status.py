from sqlalchemy import Column, Integer, String
from app.database import Base


class AssetStatus(Base):
    __tablename__ = "asset_statuses"

    status_id = Column(Integer, primary_key=True, index=True)

    status_name = Column(String(50), unique=True, nullable=False)