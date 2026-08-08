"""Dashboard routes."""

from fastapi import APIRouter

from app.auth.auth_bearer import CurrentUser
from app.deps import DbSession
from app.services import dashboard_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard_summary(db: DbSession, current_user: CurrentUser):
    """Role-aware summary, aggregated in SQL and scoped to what the caller may see."""
    return dashboard_service.build_summary(db, current_user)
