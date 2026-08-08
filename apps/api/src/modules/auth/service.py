"""Business logic and transaction boundaries for the auth module (FR-SYS-001 … FR-SYS-004).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.deps import ROLES, AuthenticatedUser
from src.core.errors import PermissionDeniedError
from src.core.security import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    verify_password,
)
from src.modules.auth.models import RefreshToken
from src.modules.users import service as users_service
from src.modules.users.models import User, UserArea


class InvalidCredentialsError(PermissionDeniedError):
    status_code = 401
    error_type = "invalid-credentials"
    title = "Invalid email or password"


class AccountNotActiveError(PermissionDeniedError):
    status_code = 403
    error_type = "account-not-active"
    title = "Account is not active"


async def _load_area_ids(session: AsyncSession, user_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await session.execute(select(UserArea.area_id).where(UserArea.user_id == user_id))
    return [row[0] for row in rows.all()]


async def login(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    user_agent: str | None,
    ip: str | None,
) -> tuple[str, str, datetime, User, list[uuid.UUID]]:
    """Returns (access_token, refresh_plaintext, refresh_expires_at, user, area_ids).

    Raises `InvalidCredentialsError` on any mismatch — deliberately the same error
    for "no such email" and "wrong password" so a login attempt cannot be used to
    enumerate registered accounts.
    """
    result = await session.execute(
        select(User).where(User.email == email, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("The email or password you entered is incorrect.")

    if user.status != "active":
        raise AccountNotActiveError(
            "Your account is pending activation or has been disabled. Contact the barangay office."
        )

    area_ids = await _load_area_ids(session, user.id) if user.role == "bhw" else []

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_plaintext, refresh_hash, refresh_expires_at = create_refresh_token()

    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires_at,
            user_agent=user_agent,
            ip=ip,
        )
    )
    user.last_login_at = datetime.now(UTC)

    await write_audit(
        session,
        actor_user_id=user.id,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        ip=ip,
    )
    await session.commit()

    return access_token, refresh_plaintext, refresh_expires_at, user, area_ids


async def register(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    full_name: str,
    user_agent: str | None,
    ip: str | None,
) -> tuple[str, str, datetime, User]:
    """FR-SYS-001 — a resident creating their own account.

    Deliberately mirrors `login()`'s shape: create the row, issue tokens, audit,
    one commit. Role is always `"head"` and status is always `"active"` — no
    email-verification flow exists, and `login()` hard-rejects anything but
    `"active"`, so `"pending"` (the model's default) would leave a freshly
    registered resident unable to sign in. No `contact_number` here — that's
    captured (and required unless flagged unreachable) at onboarding instead.
    """
    user = await users_service.create_user(
        session,
        email=email,
        password=password,
        full_name=full_name,
        contact_number=None,
        role="head",
        status="active",
    )

    access_token = create_access_token(subject=user.id, role="head")
    refresh_plaintext, refresh_hash, refresh_expires_at = create_refresh_token()

    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires_at,
            user_agent=user_agent,
            ip=ip,
        )
    )

    await write_audit(
        session,
        actor_user_id=user.id,
        action="auth.register",
        entity_type="user",
        entity_id=user.id,
        ip=ip,
    )
    await session.commit()

    return access_token, refresh_plaintext, refresh_expires_at, user


async def refresh(session: AsyncSession, *, refresh_plaintext: str) -> tuple[str, User]:
    """Rotate nothing — same refresh token, a fresh access token.

    Full rotation-on-use is a reasonable hardening step; not implemented here to
    keep the surface small for this pass. `revoked_at` is what logout sets.
    """
    token_hash = hash_refresh_token(refresh_plaintext)
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    token = result.scalar_one_or_none()

    if token is None or token.revoked_at is not None or token.expires_at < datetime.now(UTC):
        raise InvalidCredentialsError("Session expired. Please log in again.")

    user = await session.get(User, token.user_id)
    if user is None or user.status != "active" or user.deleted_at is not None:
        raise AccountNotActiveError("Your account is no longer active.")

    access_token = create_access_token(subject=user.id, role=user.role)
    return access_token, user


async def logout(
    session: AsyncSession, *, refresh_plaintext: str, actor_user_id: uuid.UUID | None
) -> None:
    token_hash = hash_refresh_token(refresh_plaintext)
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    token = result.scalar_one_or_none()
    if token is not None and token.revoked_at is None:
        token.revoked_at = datetime.now(UTC)
        await write_audit(
            session,
            actor_user_id=actor_user_id or token.user_id,
            action="auth.logout",
            entity_type="user",
            entity_id=token.user_id,
        )
        await session.commit()


async def get_me(session: AsyncSession, user: AuthenticatedUser) -> User:
    result = await session.execute(select(User).where(User.id == user.id))
    return result.scalar_one()


assert set(ROLES) <= {"head", "bhw", "admin", "sk", "superadmin"}  # sanity guard, no drift
