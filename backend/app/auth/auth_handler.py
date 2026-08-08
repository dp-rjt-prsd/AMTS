"""JWT creation and verification."""

import uuid
from datetime import datetime, timedelta, timezone

from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings


class TokenExpired(Exception):
    """Token is well-formed but past its expiry."""


class TokenInvalid(Exception):
    """Token is malformed, mis-signed, or missing claims."""


def create_access_token(
    *,
    user_id: int,
    email: str,
    role: str,
    name: str,
) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email,
        "role": role,
        # Needed by the scan endpoint to build its confirmation message.
        "name": name,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        # Unique token id; the hook a future revocation list would use.
        "jti": uuid.uuid4().hex,
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict:
    """Decode a token, raising TokenExpired or TokenInvalid so callers can tell them apart."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except ExpiredSignatureError as exc:
        raise TokenExpired("Token has expired") from exc
    except JWTError as exc:
        raise TokenInvalid("Token is invalid") from exc

    for claim in ("user_id", "role", "name"):
        if claim not in payload:
            raise TokenInvalid(f"Token is missing the '{claim}' claim")

    return payload
