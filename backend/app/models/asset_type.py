from sqlalchemy import Column, Integer, String

from app.database import Base


class AssetType(Base):
    __tablename__ = "asset_types"

    asset_type_id = Column(Integer, primary_key=True, index=True)

    asset_type_name = Column(String(100), unique=True, nullable=False)
