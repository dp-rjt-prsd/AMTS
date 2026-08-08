from sqlalchemy import (
    Column,
    DECIMAL,
    ForeignKey,
    Integer,
    String,
    DateTime,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"

    asset_id = Column(String(50), primary_key=True, index=True)

    procurement_by = Column(String(100))

    purchase_order_id = Column(String(100))

    asset_name = Column(String(150), nullable=False)

    asset_type_id = Column(
        Integer,
        ForeignKey("asset_types.asset_type_id"),
        nullable=False,
        index=True,
    )

    status_id = Column(
        Integer,
        ForeignKey("asset_statuses.status_id"),
        nullable=False,
        index=True,
    )

    current_holder_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        index=True,
    )

    # Nullable-unique: many assets have no serial number, but no two may share one.
    serial_number = Column(String(100), unique=True)

    price = Column(DECIMAL(12, 2))

    remarks = Column(Text)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    asset_type = relationship("AssetType", lazy="joined")
    status = relationship("AssetStatus", lazy="joined")
    current_holder = relationship("User", lazy="joined", foreign_keys=[current_holder_id])
