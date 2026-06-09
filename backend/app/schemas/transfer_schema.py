from pydantic import BaseModel, Field
from typing import Optional


class TransferCreate(BaseModel):
    """Schema for creating asset transfer"""
    asset_id: str = Field(..., min_length=1, description="Asset ID")
    to_user_id: int = Field(..., ge=1, description="Receiving user ID")
    from_user_id: Optional[int] = Field(None, ge=1, description="From user ID (optional)")
    remarks: Optional[str] = Field(None, max_length=500, description="Transfer remarks")


class TransferResponse(BaseModel):
    """Schema for transfer response"""
    transfer_id: int
    asset_id: str
    from_user_id: Optional[int]
    to_user_id: int
    remarks: Optional[str]
    transferred_at: Optional[str]

    class Config:
        from_attributes = True