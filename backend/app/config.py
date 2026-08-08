"""Application settings, loaded once at import time."""

from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Required. No defaults, so a missing value stops the app at startup.
    SECRET_KEY: str = Field(..., min_length=32)
    DATABASE_URL: str = Field(...)

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Comma-separated exact origins. Wildcards are rejected below.
    CORS_ORIGINS: str = "http://localhost:5500,http://127.0.0.1:5500"

    LOGIN_RATE_LIMIT: str = "10/minute"

    # Used only by seed.py. Reserved TLDs such as .local fail email validation.
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@amts.org"
    BOOTSTRAP_ADMIN_PASSWORD: Optional[str] = None
    BOOTSTRAP_ADMIN_NAME: str = "System Administrator"
    BOOTSTRAP_ADMIN_EMP_ID: str = "EMP001"

    @field_validator("SECRET_KEY")
    @classmethod
    def reject_placeholder_secret(cls, v: str) -> str:
        placeholders = {
            "your_secret_key_here",
            "changeme",
            "secret",
            "supersecret",
        }
        if v.strip().lower() in placeholders:
            raise ValueError(
                "SECRET_KEY is set to a known placeholder value. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        return v

    @field_validator("CORS_ORIGINS")
    @classmethod
    def reject_wildcard_origin(cls, v: str) -> str:
        if "*" in v:
            raise ValueError(
                "CORS_ORIGINS must list exact origins. '*' cannot be combined "
                "with credentialed requests and leaves the API open to any site."
            )
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
