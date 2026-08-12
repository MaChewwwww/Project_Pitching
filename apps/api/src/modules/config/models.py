"""Legacy configuration records and PSGC address reference data.

Covers FR-SYS-010 and FR-SYS-012 (schema.md Section 4). Runtime operational
values are now read from the deployment environment; the config table remains
for migration compatibility and historical reference data.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base

PSGC_LEVELS = ("region", "province", "city", "barangay")


class Config(Base):
    """Legacy typed key/value settings (FR-SYS-010, FR-ANL-002).

    This table is why FR-ANL-002 and FR-ANL-003 stay honest. Barangay-wide totals
    live here as *configuration*; registered counts are always `COUNT(*)`. Two
    different things, two different mechanisms, never one column.
    """

    __tablename__ = "config"

    key: Mapped[str] = mapped_column(Text, primary_key=True)  # "alert.threshold_level_1_m"
    value: Mapped[dict | list | str | int | float | bool] = mapped_column(JSONB, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # shown in the admin UI

    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Psgc(Base):
    """Philippine Standard Geographic Code hierarchy (FR-SYS-012).

    One self-referencing table rather than four — the hierarchy is uniform and the
    cascading select is a single recursive query. Static reference data, loaded at
    migration time, never fetched at runtime.
    """

    __tablename__ = "psgc"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(10), nullable=False)
    parent_code: Mapped[str | None] = mapped_column(
        String(10),
        ForeignKey("psgc.code", ondelete="RESTRICT"),
        nullable=True,
    )

    __table_args__ = (CheckConstraint(f"level IN {PSGC_LEVELS}", name="psgc_level_valid"),)
