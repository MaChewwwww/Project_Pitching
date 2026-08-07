"""Password hashing and JWT issue/verify.

Concentrated in one file on purpose (architecture.md AR-6): auth defects are the
most likely serious flaw in a project this size, so there is exactly one place to
review and one place to fix.

Rules that are not negotiable:
  - argon2 for passwords. Never bcrypt-by-hand, never SHA-anything (NFR-SEC-001).
  - Access tokens are short-lived and live in memory on the client.
  - Refresh tokens are stored hashed. The plaintext exists only in the cookie.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from passlib.context import CryptContext

from src.core.config import settings

TokenType = Literal["access", "refresh"]

_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# --- passwords --------------------------------------------------------------


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def needs_rehash(hashed: str) -> bool:
    """True when the stored hash uses outdated parameters — rehash on next login."""
    return _pwd_context.needs_update(hashed)


# --- access tokens ----------------------------------------------------------


def create_access_token(
    *,
    subject: str | uuid.UUID,
    role: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "jti": uuid.uuid4().hex,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_type: TokenType = "access") -> dict[str, Any]:
    """Decode and validate. Raises `jwt.PyJWTError` on anything wrong.

    Callers in `deps.py` translate the exception into a 401 — services never see it.
    """
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"expected a {expected_type} token")
    return payload


# --- refresh tokens ---------------------------------------------------------


def create_refresh_token() -> tuple[str, str, datetime]:
    """Return `(plaintext, hash, expires_at)`.

    The plaintext goes into the httpOnly cookie and is never stored. Only the hash
    reaches the database (schema.md `refresh_token.token_hash`), so a database leak
    does not hand out sessions.
    """
    plaintext = secrets.token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_days)
    return plaintext, hash_refresh_token(plaintext), expires_at


def hash_refresh_token(plaintext: str) -> str:
    """SHA-256 rather than argon2 — deliberately.

    This is a 384-bit random value, not a human-chosen password. There is nothing
    to brute-force, and refresh happens often enough that argon2's cost would be
    paid on every rotation for no security gain.
    """
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()
