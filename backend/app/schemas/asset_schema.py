import re
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Shared by the create path, the URL path and the QR scan path.
ASSET_ID_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9_-]{2,49}$")


class AssetCreate(BaseModel):
    asset_id: str = Field(..., min_length=3, max_length=50)
    procurement_by: Optional[str] = Field(None, max_length=100)
    purchase_order_id: Optional[str] = Field(None, max_length=100)
    asset_name: str = Field(..., min_length=1, max_length=150)
    asset_type_id: int = Field(..., ge=1)
    status_id: int = Field(..., ge=1)
    current_holder_id: Optional[int] = Field(None, ge=1)
    serial_number: Optional[str] = Field(None, max_length=100)
    price: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("asset_id")
    @classmethod
    def normalise_asset_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not ASSET_ID_PATTERN.match(v):
            raise ValueError(
                "Asset ID must be 3-50 characters: letters, digits, dashes or "
                "underscores, starting with a letter or digit"
            )
        return v

    @field_validator("serial_number", "procurement_by", "purchase_order_id", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        """Treat an empty form field as absent, so blanks do not collide on unique columns."""
        if v is None:
            return None
        return v.strip() or None


class AssetStatusUpdate(BaseModel):
    status_id: int = Field(..., ge=1)


class AssetResponse(BaseModel):
    asset_id: str
    asset_name: str
    procurement_by: Optional[str] = None
    purchase_order_id: Optional[str] = None
    asset_type_id: int
    asset_type_name: Optional[str] = None
    status_id: int
    status_name: Optional[str] = None
    current_holder_id: Optional[int] = None
    holder_name: Optional[str] = None
    serial_number: Optional[str] = None
    price: Optional[Decimal] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AssetDetailResponse(AssetResponse):
    """Single-asset view, which additionally carries the generated QR image."""

    qr_code: Optional[str] = None


class AssetTypeResponse(BaseModel):
    asset_type_id: int
    asset_type_name: str

    model_config = ConfigDict(from_attributes=True)


class AssetStatusResponse(BaseModel):
    status_id: int
    status_name: str

    model_config = ConfigDict(from_attributes=True)


class ScanRequest(BaseModel):
    asset_id: str = Field(..., min_length=3, max_length=50)

    @field_validator("asset_id")
    @classmethod
    def normalise_asset_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not ASSET_ID_PATTERN.match(v):
            raise ValueError("Scanned code is not a valid asset ID")
        return v
