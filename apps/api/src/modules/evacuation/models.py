"""SQLAlchemy ORM models for the evacuation module (FR-EVC-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.

`evac_checkin` identifies either a registered member or an unregistered walk-in.
Its partial indexes enforce one open physical location per person across all
concurrent emergency events (FR-EVC-004/005).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, UUIDPrimaryKeyMixin

EMERGENCY_EVENT_TYPES = ("flood", "earthquake", "typhoon", "fire", "other")


class EmergencyEvent(UUIDPrimaryKeyMixin, Base):
    """Scopes safety statuses, rescue requests, incident reports, donation drives."""

    __tablename__ = "emergency_event"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    declared_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(f"type IN {EMERGENCY_EVENT_TYPES}", name="emergency_event_type_valid"),
    )


class EvacCenter(Base):
    """FR-EVC-001 … 003. One row per `facility` of type evacuation_center."""

    __tablename__ = "evac_center"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    facility_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("facility.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contact_person: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class EvacCheckin(UUIDPrimaryKeyMixin, Base):
    """FR-EVC-004/005. Records resident check-ins at an evacuation center."""

    __tablename__ = "evac_checkin"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    evac_center_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("evac_center.id", ondelete="CASCADE"), nullable=False
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("member.id", ondelete="CASCADE"), nullable=True
    )
    unregistered_person_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("unregistered_person.id", ondelete="CASCADE"),
        nullable=True,
    )
    person_name: Mapped[str] = mapped_column(Text, nullable=False)
    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(member_id, unregistered_person_id) = 1",
            name="chk_evac_checkin_subject_exactly_one",
        ),
        Index(
            "uq_evac_checkin_open_member",
            "member_id",
            unique=True,
            postgresql_where=text("checked_out_at IS NULL AND member_id IS NOT NULL"),
        ),
        Index(
            "uq_evac_checkin_open_unregistered",
            "unregistered_person_id",
            unique=True,
            postgresql_where=text("checked_out_at IS NULL AND unregistered_person_id IS NOT NULL"),
        ),
    )
