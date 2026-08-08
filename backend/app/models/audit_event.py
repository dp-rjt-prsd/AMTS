from sqlalchemy import Column, Enum, ForeignKey, Index, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base
from app.enums import AuditAction


class AuditEvent(Base):
    """Append-only record of every state-changing action. Rows are never updated or deleted."""

    __tablename__ = "audit_events"

    event_id = Column(Integer, primary_key=True, index=True)

    # Nullable so failed logins, where no user resolves, can still be logged.
    actor_id = Column(Integer, ForeignKey("users.user_id"), index=True)

    actor_email = Column(String(100))

    action = Column(
        Enum(AuditAction, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        index=True,
    )

    entity_type = Column(String(50), nullable=False)

    entity_id = Column(String(50), nullable=False, index=True)

    # JSON-serialised snapshots of the changed fields only.
    before = Column(Text)

    after = Column(Text)

    ip_address = Column(String(45))

    occurred_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id", "occurred_at"),
    )
