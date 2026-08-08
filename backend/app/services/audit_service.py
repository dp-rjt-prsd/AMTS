"""Append-only audit trail."""

import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.enums import AuditAction
from app.models.audit_event import AuditEvent


def _serialise(payload: Optional[dict[str, Any]]) -> Optional[str]:
    if payload is None:
        return None
    return json.dumps(payload, default=str, sort_keys=True)


def record(
    db: Session,
    *,
    action: AuditAction,
    entity_type: str,
    entity_id: str | int,
    actor: Optional[dict] = None,
    before: Optional[dict[str, Any]] = None,
    after: Optional[dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> AuditEvent:
    """Stage an audit row.

    Does not commit, so the event lands in the caller's transaction and an
    action and its audit record either both persist or neither does.
    """
    event = AuditEvent(
        actor_id=(actor or {}).get("user_id"),
        actor_email=(actor or {}).get("email"),
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before=_serialise(before),
        after=_serialise(after),
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(event)
    return event
