from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    TIMESTAMP
)

from app.database import Base


class RepairLog(Base):
    __tablename__ = "repair_logs"

    repair_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    asset_id = Column(
        String(50),
        ForeignKey("assets.asset_id")
    )

    issue_description = Column(
        Text,
        nullable=False
    )

    sent_at = Column(TIMESTAMP)

    returned_at = Column(TIMESTAMP)