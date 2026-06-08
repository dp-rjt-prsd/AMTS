from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    TIMESTAMP
)

from sqlalchemy.sql import func

from app.database import Base


class AssetTransferLog(Base):
    __tablename__ = "asset_transfer_logs"

    transfer_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    asset_id = Column(
        String(50),
        ForeignKey("assets.asset_id")
    )

    from_user_id = Column(
        Integer,
        ForeignKey("users.user_id")
    )

    to_user_id = Column(
        Integer,
        ForeignKey("users.user_id")
    )

    remarks = Column(Text)

    transferred_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )