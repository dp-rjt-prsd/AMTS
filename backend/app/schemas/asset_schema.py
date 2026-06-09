from pydantic import BaseModel, Field, field_validator
from typing import Optional
from decimal import Decimal


class AssetCreate(BaseModel):
    """Schema for creating new asset"""
    asset_id: str = Field(..., min_length=3, max_length=50, description="Unique asset ID")
    procurement_by: Optional[str] = Field(None, max_length=100, description="Procured by")
    purchase_order_id: Optional[str] = Field(None, max_length=100, description="PO number")
    asset_name: str = Field(..., min_length=1, max_length=150, description="Asset name")
    asset_type_id: int = Field(..., ge=1, description="Asset type ID")
    status_id: int = Field(..., ge=1, description="Asset status ID")
    current_holder_id: Optional[int] = Field(None, ge=1, description="Current user ID")
    serial_number: Optional[str] = Field(None, max_length=100, description="Serial number")
    price: Optional[Decimal] = Field(None, ge=0, description="Purchase price")
    remarks: Optional[str] = Field(None, max_length=500, description="Remarks")

    @field_validator('asset_id')
    @classmethod
    def validate_asset_id(cls, v):
        if not v or not v.strip():
            raise ValueError("Asset ID cannot be empty")
        return v.upper()


class AssetResponse(BaseModel):
    """Schema for asset response"""
    asset_id: str
    asset_name: str
    asset_type_id: int
    status_id: int
    price: Optional[Decimal]
    serial_number: Optional[str]
    procurement_by: Optional[str]
    purchase_order_id: Optional[str]
    current_holder_id: Optional[int]
    remarks: Optional[str]
    qr_code: Optional[str] = Field(None, description="Base64 encoded QR code")
    created_at: Optional[str]

    class Config:
        from_attributes = True