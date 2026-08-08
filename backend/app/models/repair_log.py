from sqlalchemy import Column, ForeignKey, Index, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RepairLog(Base):
    __tablename__ = "repair_logs"

    repair_id = Column(Integer, primary_key=True, index=True)

    asset_id = Column(
        String(50),
        ForeignKey("assets.asset_id"),
        nullable=False,
        index=True,
    )

    issue_description = Column(Text, nullable=False)

    sent_at = Column(DateTime, server_default=func.now(), nullable=False)

    returned_at = Column(DateTime)

    opened_by_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    closed_by_id = Column(Integer, ForeignKey("users.user_id"))

    opened_by = relationship("User", foreign_keys=[opened_by_id], lazy="joined")
    closed_by = relationship("User", foreign_keys=[closed_by_id], lazy="joined")

    __table_args__ = (
        # Open repairs for an asset.
        Index("ix_repair_asset_open", "asset_id", "returned_at"),
    )
