from pydantic import BaseModel
from typing import Optional


class TransferCreate(BaseModel):
    asset_id: str
    from_user_id: Optional[int] = None
    to_user_id: int
    remarks: Optional[str] = None