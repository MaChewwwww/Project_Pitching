"""SQLAlchemy ORM models for the preparedness module (FR-PRP-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, UUIDPrimaryKeyMixin

HAZARD_TYPES = ("flood", "earthquake", "typhoon", "fire", "landslide", "general", "food")
GUIDE_PHASES = ("before", "during", "after", "n/a")


class Guide(UUIDPrimaryKeyMixin, Base):
    """Bilingual hazard guides (FR-PRP-001/003/004/007, FR-PUB-005).

    Bilingual columns rather than a translation table — two languages, fixed
    (BR-0.19); a join on every read would buy nothing at this scale.
    """

    __tablename__ = "guide"

    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    hazard_type: Mapped[str] = mapped_column(Text, nullable=False)
    title_fil: Mapped[str] = mapped_column(Text, nullable=False)
    title_en: Mapped[str] = mapped_column(Text, nullable=False)
    body_fil: Mapped[str] = mapped_column(Text, nullable=False)
    body_en: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'n/a'"))
    source_attribution: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    __table_args__ = (
        CheckConstraint(f"hazard_type IN {HAZARD_TYPES}", name="guide_hazard_type_valid"),
        CheckConstraint(f"phase IN {GUIDE_PHASES}", name="guide_phase_valid"),
    )


class Faq(UUIDPrimaryKeyMixin, Base):
    """FR-PRP-005, FR-PUB-011."""

    __tablename__ = "faq"

    question_fil: Mapped[str] = mapped_column(Text, nullable=False)
    question_en: Mapped[str] = mapped_column(Text, nullable=False)
    answer_fil: Mapped[str] = mapped_column(Text, nullable=False)
    answer_en: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class GoBagItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "go_bag_item"

    name_fil: Mapped[str] = mapped_column(Text, nullable=False)
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    is_essential: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))


class GoBagProgress(Base):
    __tablename__ = "go_bag_progress"

    household_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("household.id", ondelete="CASCADE"), primary_key=True
    )
    go_bag_item_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("go_bag_item.id", ondelete="CASCADE"), primary_key=True
    )
    has_item: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class FamilyEmergencyPlan(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "family_emergency_plan"

    household_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("household.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    meeting_point: Mapped[str | None] = mapped_column(Text, nullable=True)
    out_of_area_contact: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
