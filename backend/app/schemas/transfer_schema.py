from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.asset_schema import ASSET_ID_PATTERN


class TransferCreate(BaseModel):
    asset_id: str = Field(..., min_length=3, max_length=50)
    to_user_id: int = Field(..., ge=1)
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("asset_id")
    @classmethod
    def normalise_asset_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not ASSET_ID_PATTERN.match(v):
            raise ValueError("Invalid asset ID format")
        return v


class ReturnRequest(BaseModel):
    remarks: Optional[str] = Field(None, max_length=500)


class TransferResponse(BaseModel):
    transfer_id: int
    asset_id: str
    from_user_id: Optional[int]
    to_user_id: Optional[int]
    from_user_name: Optional[str] = None
    to_user_name: Optional[str] = None
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None
    remarks: Optional[str]
    transferred_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
