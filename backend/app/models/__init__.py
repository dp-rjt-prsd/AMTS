"""Model package. Importing it registers every table on Base.metadata."""

from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.audit_event import AuditEvent
from app.models.department import Department
from app.models.repair_log import RepairLog
from app.models.transfer_log import AssetTransferLog
from app.models.user import User

__all__ = [
    "Asset",
    "AssetStatus",
    "AssetTransferLog",
    "AssetType",
    "AuditEvent",
    "Department",
    "RepairLog",
    "User",
]
