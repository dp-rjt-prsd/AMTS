from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DECIMAL,
    ForeignKey,
    TIMESTAMP
)

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
        ForeignKey("asset_types.asset_type_id")
    )

    status_id = Column(
        Integer,
        ForeignKey("asset_statuses.status_id")
    )

    current_holder_id = Column(
        Integer,
        ForeignKey("users.user_id")
    )

    serial_number = Column(String(100))

    price = Column(DECIMAL(12, 2))

    remarks = Column(Text)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )