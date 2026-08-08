"""SQLAlchemy ORM models for the registry module (FR-REG-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.

**Scope note.** Only `household` and `member` land in this pass — enough for real
`registered_households` / `registered_members` counts on the public site
(FR-ANL-002/003). Nutrition, vulnerability, feedback, and every registry *screen*
are out of scope here; see AGENTS.md excluded-features list and the plan this
migration was written against.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

HOUSEHOLD_SOURCES = ("self", "bhw")
MEMBER_SEXES = ("male", "female")


class Household(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """The registry anchor (FR-REG-001 … 011)."""

    __tablename__ = "household"

    reference_no: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    head_name: Mapped[str] = mapped_column(Text, nullable=False)
    head_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_unreachable_by_phone: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    area_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("area.id", ondelete="RESTRICT"), nullable=False
    )
    psgc_barangay_code: Mapped[str | None] = mapped_column(
        Text, ForeignKey("psgc.code", ondelete="SET NULL"), nullable=True
    )
    street_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )
    source: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    stale_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    merged_into_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("household.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(f"source IN {HOUSEHOLD_SOURCES}", name="household_source_valid"),
        Index("idx_household_area", "area_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_household_location", "location", postgresql_using="gist"),
        Index("idx_household_source", "source", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_household_head", "head_user_id"),
    )


class Member(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """FR-REG-020 … 026. Vulnerability flags as booleans (schema.md rationale)."""

    __tablename__ = "member"

    household_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("household.id", ondelete="CASCADE"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sex: Mapped[str | None] = mapped_column(Text, nullable=True)
    relationship_to_head: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_head: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_child: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_senior: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_pwd: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_pregnant: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_lactating: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    has_chronic_condition: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    chronic_condition_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_bedridden: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    __table_args__ = (
        CheckConstraint(f"sex IS NULL OR sex IN {MEMBER_SEXES}", name="member_sex_valid"),
        Index("idx_member_household", "household_id", postgresql_where=text("deleted_at IS NULL")),
        Index(
            "idx_member_one_head",
            "household_id",
            unique=True,
            postgresql_where=text("is_head AND deleted_at IS NULL"),
        ),
    )
