"""SQLAlchemy ORM models for the weather module (FR-WX-*).

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
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, UUIDPrimaryKeyMixin

READING_SOURCES = ("open_meteo", "pagasa", "manual")
FORECAST_SOURCES = ("open_meteo", "pagasa")
METRICS = (
    "river_level",
    "rainfall",
    "temperature",
    "humidity",
    "heat_index",
    "precipitation_probability",
    "tcws_signal",
)
FORECAST_HORIZONS = ("hourly", "daily")


class Reading(Base):
    """One row per external measurement (FR-WX-001 … 012).

    Two timestamps — `observed_at` (when the world was measured) and `fetched_at`
    (when we learned it) — the gap between them *is* the staleness (FR-WX-011).
    """

    __tablename__ = "reading"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    metric: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    station: Mapped[str | None] = mapped_column(Text, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    entered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        CheckConstraint(f"source IN {READING_SOURCES}", name="reading_source_valid"),
        CheckConstraint(f"metric IN {METRICS}", name="reading_metric_valid"),
        Index("idx_reading_latest", "metric", "source", text("observed_at DESC")),
    )


class Forecast(Base):
    """A forecast point (FR-WX-002/015) — never mixed with `reading`.

    A forecast is superseded, not appended: each fetch upserts on
    (source, metric, horizon, valid_at) so a refreshed series replaces the
    previous one for the same moment instead of accumulating duplicates.
    """

    __tablename__ = "forecast"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    metric: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    valid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    horizon: Mapped[str] = mapped_column(Text, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        CheckConstraint(f"source IN {FORECAST_SOURCES}", name="forecast_source_valid"),
        CheckConstraint(f"metric IN {METRICS}", name="forecast_metric_valid"),
        CheckConstraint(f"horizon IN {FORECAST_HORIZONS}", name="forecast_horizon_valid"),
        UniqueConstraint("source", "metric", "horizon", "valid_at", name="forecast_point_unique"),
        Index("idx_forecast_upcoming", "metric", "horizon", "valid_at"),
    )


class FloodEvent(UUIDPrimaryKeyMixin, Base):
    """FR-WX-013."""

    __tablename__ = "flood_event"

    emergency_event_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    peak_level_m: Mapped[float | None] = mapped_column(Numeric(10, 3), nullable=True)
    peak_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    households_displaced: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class FloodEventArea(Base):
    """Areas affected (FR-WX-013). Empty means unrecorded, NOT barangay-wide —
    the opposite convention from `announcement_area`."""

    __tablename__ = "flood_event_area"

    flood_event_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("flood_event.id", ondelete="CASCADE"), primary_key=True
    )
    area_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("area.id", ondelete="CASCADE"), primary_key=True
    )
