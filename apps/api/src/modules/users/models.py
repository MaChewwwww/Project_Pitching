"""User accounts, BHW area assignments, and the audit log.

Covers FR-SYS-005 … FR-SYS-009. Transcribed from docs/schema.md Section 3 — do not
invent columns here; if a requirement needs one that is missing, that is a doc gap
to raise (AGENTS.md Section 1).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT, INET, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

# BRD 5.1 names six roles; `public` is the absence of a user, so five are stored.
USER_ROLES = ("head", "bhw", "admin", "sk", "superadmin")
USER_STATUSES = ("pending", "active", "disabled")


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "user"

    # CITEXT so "Juan@example.com" and "juan@example.com" cannot both register.
    email: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)

    role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="pending")

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(f"role IN {USER_ROLES}", name="user_role_valid"),
        CheckConstraint(f"status IN {USER_STATUSES}", name="user_status_valid"),
        # Partial: only live rows are ever listed in the admin console.
        Index(
            "idx_user_role_status",
            "role",
            "status",
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )


class UserArea(Base):
    """BHW area scoping (FR-SYS-007).

    The enforcement point for `apply_area_scope` — the repository joins against this
    by default for `bhw` users (architecture.md Section 7.2).
    """

    __tablename__ = "user_area"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    area_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("area.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AuditLog(Base):
    """Append-only record of every state change (FR-SYS-008).

    No update or delete path exists in the application. BIGSERIAL rather than UUID
    because this is the highest-volume table and nothing references it.
    """

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,  # null for system actions
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)  # "household.create"
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    changes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # before/after
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("idx_audit_entity", "entity_type", "entity_id", text("created_at DESC")),
        Index("idx_audit_actor", "actor_user_id", text("created_at DESC")),
    )
