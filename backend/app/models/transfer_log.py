from sqlalchemy import Column, ForeignKey, Index, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AssetTransferLog(Base):
    __tablename__ = "asset_transfer_logs"

    transfer_id = Column(Integer, primary_key=True, index=True)

    asset_id = Column(
        String(50),
        ForeignKey("assets.asset_id"),
        nullable=False,
        index=True,
    )

    from_user_id = Column(Integer, ForeignKey("users.user_id"))

    to_user_id = Column(Integer, ForeignKey("users.user_id"))

    # Who performed the transfer, which need not be either party.
    performed_by_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True,
    )

    remarks = Column(Text)

    transferred_at = Column(DateTime, server_default=func.now(), nullable=False)

    from_user = relationship("User", foreign_keys=[from_user_id], lazy="joined")
    to_user = relationship("User", foreign_keys=[to_user_id], lazy="joined")
    performed_by = relationship("User", foreign_keys=[performed_by_id], lazy="joined")

    __table_args__ = (
        # History for one asset, newest first.
        Index("ix_transfer_asset_time", "asset_id", "transferred_at"),
    )
