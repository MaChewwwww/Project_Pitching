"""SQLAlchemy ORM models for the activities module (FR-ACT-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

ACTIVITY_TYPES = (
    "drill",
    "seminar",
    "first_aid",
    "cleanup",
    "tree_planting",
    "ngo_program",
    "other",
)


class Activity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """FR-ACT-001 … 003."""

    __tablename__ = "activity"

    title: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    body_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    publication_status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'draft'")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    venue: Mapped[str | None] = mapped_column(Text, nullable=True)
    area_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("area.id", ondelete="SET NULL"), nullable=True
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(f"type IN {ACTIVITY_TYPES}", name="activity_type_valid"),
        CheckConstraint(
            "publication_status IN ('draft', 'published', 'archived')",
            name="activity_publication_status_valid",
        ),
    )


class ActivityImage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "activity_image"

    activity_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("activity.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    alt_text: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(nullable=False, server_default=text("0"))
    is_cover: Mapped[bool] = mapped_column(nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        Index("uq_activity_image_sort", "activity_id", "sort_order", unique=True),
        Index(
            "uq_activity_image_cover", "activity_id", unique=True, postgresql_where=text("is_cover")
        ),
    )
