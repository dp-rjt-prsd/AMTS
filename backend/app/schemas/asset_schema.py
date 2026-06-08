from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class AssetCreate(BaseModel):
    asset_id: str
    procurement_by: Optional[str] = None
    purchase_order_id: Optional[str] = None
    asset_name: str
    asset_type_id: int
    status_id: int
    current_holder_id: Optional[int] = None
    serial_number: Optional[str] = None
    price: Optional[Decimal] = None
    remarks: Optional[str] = None


class AssetResponse(BaseModel):
    asset_id: str
    asset_name: str
    asset_type_id: int
    status_id: int

    class Config:
        from_attributes = True