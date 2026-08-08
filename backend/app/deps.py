"""Shared FastAPI dependencies."""

from typing import Annotated, Generator

from fastapi import Depends, Path
from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def normalise_asset_id(
    asset_id: str = Path(..., min_length=3, max_length=50),
) -> str:
    """Canonicalise an asset id from the URL path. Ids are stored upper-case."""
    return asset_id.strip().upper()


AssetIdPath = Annotated[str, Depends(normalise_asset_id)]
