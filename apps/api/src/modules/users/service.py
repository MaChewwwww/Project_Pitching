"""Business logic and transaction boundaries for the users module (FR-SYS-005 … FR-SYS-009).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import ConflictError, NotFoundError
from src.core.security import hash_password
from src.modules.users.models import User


class EmailAlreadyTakenError(ConflictError):
    error_type = "email-taken"
    title = "Email already registered"


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    full_name: str,
    contact_number: str | None,
    role: str,
    status: str,
) -> User:
    """Raises `EmailAlreadyTakenError` (mapped to a field-level 409) rather than
    letting the unique constraint surface as a raw `IntegrityError`.

    Checked up front rather than caught after insert, for a simpler happy path.
    This is a genuine (if narrow) TOCTOU race under concurrent signups with the
    same email — the DB's `uq_user_email` constraint is still the actual
    guarantee; a raw `IntegrityError` past this point is a bug in this check,
    not an expected outcome to also handle."""
    existing = await session.execute(select(User.id).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise EmailAlreadyTakenError(
            "An account with this email already exists.",
            errors=[{"field": "email", "message": "Already registered.", "code": "email_taken"}],
        )

    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        contact_number=contact_number,
        role=role,
        status=status,
    )
    session.add(user)
    await session.flush()
    return user


async def get_user_or_404(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found.")
    return user
