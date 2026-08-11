"""SQLAlchemy ORM models for the alerts module (FR-ALT-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.
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
    Numeric,
    SmallInteger,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, UUIDPrimaryKeyMixin

ANNOUNCEMENT_KINDS = ("announcement", "alert")
ANNOUNCEMENT_TYPES = (
    "general",
    "class_suspension",
    "road_closure",
    "utility_interruption",
    "flood_warning",
    "earthquake",
    "typhoon",
    "heavy_rainfall",
    "heat_index",
    "evacuation",
)
ANNOUNCEMENT_SEVERITIES = ("info", "warning", "emergency")


class Announcement(UUIDPrimaryKeyMixin, Base):
    """One table, two presentations (FR-ALT-001 … 011). `kind` decides which."""

    __tablename__ = "announcement"

    kind: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str | None] = mapped_column(Text, nullable=True)
    alert_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    body_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    publication_status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'draft'")
    )
    # NOT NULL when kind='alert' — enforced by the CHECK below (FR-ALT-005).
    instruction: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_barangay_wide: Mapped[bool] = mapped_column(nullable=False, server_default=text("true"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    issued_by_user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(f"kind IN {ANNOUNCEMENT_KINDS}", name="announcement_kind_valid"),
        CheckConstraint(f"type IN {ANNOUNCEMENT_TYPES}", name="announcement_type_valid"),
        CheckConstraint(
            f"severity IS NULL OR severity IN {ANNOUNCEMENT_SEVERITIES}",
            name="announcement_severity_valid",
        ),
        CheckConstraint(
            "alert_level IS NULL OR alert_level IN (1, 2, 3)", name="announcement_alert_level_valid"
        ),
        # FR-ALT-005: an alert cannot be saved without telling people what to do.
        CheckConstraint(
            "kind <> 'alert' OR instruction IS NOT NULL", name="alert_needs_instruction"
        ),
        CheckConstraint(
            "publication_status IN ('draft', 'published', 'archived')",
            name="announcement_publication_status_valid",
        ),
        Index(
            "idx_announcement_active",
            "kind",
            text("published_at DESC"),
            postgresql_where=text("deactivated_at IS NULL"),
        ),
    )


class AnnouncementArea(Base):
    """Targeting (FR-ALT-003). Empty means barangay-wide."""

    __tablename__ = "announcement_area"

    announcement_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("announcement.id", ondelete="CASCADE"),
        primary_key=True,
    )
    area_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("area.id", ondelete="CASCADE"), primary_key=True
    )


class AnnouncementImage(UUIDPrimaryKeyMixin, Base):
    """Managed article media for a single announcement parent."""

    __tablename__ = "announcement_image"

    announcement_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("announcement.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    alt_text: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(nullable=False, server_default=text("0"))
    is_cover: Mapped[bool] = mapped_column(nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("uq_announcement_image_sort", "announcement_id", "sort_order", unique=True),
        Index(
            "uq_announcement_image_cover",
            "announcement_id",
            unique=True,
            postgresql_where=text("is_cover"),
        ),
    )


class AlertPrompt(UUIDPrimaryKeyMixin, Base):
    """A threshold breach awaiting a human decision (FR-WX-009, D-4).

    The scheduler writes this; publishing an alert requires a named officer
    calling POST /admin/announcements. `resulted_in_announcement_id` staying null
    is a legitimate, recorded outcome — the officer looked and decided not to warn.
    """

    __tablename__ = "alert_prompt"

    reading_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("reading.id", ondelete="SET NULL"), nullable=True
    )
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    threshold_value: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    acknowledged_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resulted_in_announcement_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("announcement.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (CheckConstraint("level IN (1, 2, 3)", name="alert_prompt_level_valid"),)
