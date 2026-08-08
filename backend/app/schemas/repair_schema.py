from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RepairCreate(BaseModel):
    """Body for opening a repair. Kept out of the query string so it stays out of access logs."""

    issue_description: str = Field(..., min_length=1, max_length=500)


class RepairResponse(BaseModel):
    repair_id: int
    asset_id: str
    issue_description: str
    sent_at: Optional[datetime]
    returned_at: Optional[datetime]
    opened_by_id: Optional[int] = None
    opened_by_name: Optional[str] = None
    closed_by_id: Optional[int] = None
    closed_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
