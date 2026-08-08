"""Password hashing and rate limiting."""

import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

# bcrypt silently truncates past 72 bytes, so reject rather than truncate.
MAX_PASSWORD_BYTES = 72

BCRYPT_ROUNDS = 12

limiter = Limiter(key_func=get_remote_address)


class PasswordTooLong(ValueError):
    pass


def hash_password(plain: str) -> str:
    encoded = plain.encode("utf-8")

    if len(encoded) > MAX_PASSWORD_BYTES:
        raise PasswordTooLong(
            f"Password must be at most {MAX_PASSWORD_BYTES} bytes when UTF-8 encoded"
        )

    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Check a password. An unparseable stored hash is a failure, not an error."""
    try:
        encoded = plain.encode("utf-8")[:MAX_PASSWORD_BYTES]
        return bcrypt.checkpw(encoded, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False
