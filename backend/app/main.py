"""FastAPI application entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from app.config import settings
from app.exception_handlers import register_exception_handlers
from app.security import limiter

# Importing the package registers every model on Base.metadata.
import app.models  # noqa: F401

from app.routes.asset_routes import router as asset_router
from app.routes.auth_routes import router as auth_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.repair_routes import router as repair_router
from app.routes.return_routes import router as return_router
from app.routes.status_routes import router as status_router
from app.routes.transfer_routes import router as transfer_router
from app.routes.user_routes import router as user_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(
    title="Asset Management & Tracking System",
    version="2.0.0",
    description="Asset tracking with QR codes and three-tier role-based access control.",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Exact origins only, from settings.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(asset_router)
app.include_router(transfer_router)
app.include_router(status_router)
app.include_router(return_router)
app.include_router(repair_router)
app.include_router(dashboard_router)


@app.get("/", tags=["meta"])
def home():
    return {"message": "Asset Management & Tracking System API", "version": "2.0.0"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
