"""SQLAlchemy ORM models for the evacuation module (FR-EVC-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.

`evac_checkin` is deliberately deferred — it FKs `member` and `unregistered_person`
(FR-SAF-012), neither of which exists yet in this pass. `PublicEvacCenter.occupancy`
is therefore always 0 until that lands (FR-EVC-004/005).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, func, text
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
