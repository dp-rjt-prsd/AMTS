from fastapi import FastAPI

from app.database import engine, Base
from fastapi.middleware.cors import CORSMiddleware

# IMPORT MODELS

from app.models.department import Department
from app.models.asset_type import AssetType
from app.models.asset_status import AssetStatus
from app.models.user import User
from app.models.asset import Asset
from app.models.transfer_log import AssetTransferLog
from app.models.repair_log import RepairLog

# IMPORT ROUTES

from app.routes.user_routes import router as user_router
from app.routes.auth_routes import router as auth_router
from app.routes.asset_routes import router as asset_router
from app.routes.transfer_routes import router as transfer_router
from app.routes.status_routes import router as status_router
from app.routes.return_routes import router as return_router
from app.routes.repair_routes import router as repair_router
from app.routes.dashboard_routes import router as dashboard_router

# CREATE TABLES

Base.metadata.create_all(bind=engine)

# FASTAPI APP

app = FastAPI()

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)

# REGISTER ROUTES

app.include_router(user_router)
app.include_router(auth_router)
app.include_router(asset_router)
app.include_router(transfer_router)
app.include_router(status_router)
app.include_router(return_router)
app.include_router(repair_router)
app.include_router(dashboard_router)

# ROOT ROUTE

@app.get("/")
def home():
    return {
        "message": "Asset Management System API Running"
    }