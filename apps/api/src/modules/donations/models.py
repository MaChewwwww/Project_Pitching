"""SQLAlchemy ORM models for the donations module (FR-DON-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around.

Register every new models module in `src/db/models_registry.py`, or Alembic
autogenerate will emit a migration that drops its table.

No monetary field exists anywhere below, and none may be added (FR-DON-010).
`assistance_record` is deliberately deferred — it is out of the information-CRUD
scope of this pass and BRD D-8 keeps it decoupled from `donation` regardless.
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
    Numeric,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, UUIDPrimaryKeyMixin

DONATION_STATUSES = ("submitted", "received", "partially_received", "not_fulfilled")


class DonationDrive(UUIDPrimaryKeyMixin, Base):
    """FR-DON-001, 009."""

    __tablename__ = "donation_drive"

    event_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    body_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    publication_status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'draft'")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    organizer_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    organizer_contact: Mapped[str | None] = mapped_column(Text, nullable=True)
    drop_off_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    active_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    active_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "publication_status IN ('draft', 'published', 'archived')",
            name="donation_drive_publication_status_valid",
        ),
    )


class DonationDriveImage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "donation_drive_image"

    donation_drive_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("donation_drive.id", ondelete="CASCADE"),
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
        Index("uq_donation_drive_image_sort", "donation_drive_id", "sort_order", unique=True),
        Index(
            "uq_donation_drive_image_cover",
            "donation_drive_id",
            unique=True,
            postgresql_where=text("is_cover"),
        ),
    )


class Donation(UUIDPrimaryKeyMixin, Base):
    """FR-DON-002 … 008. No donor account — identity lives on the row (BRD D-5)."""

    __abstract__ = True

    drive_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("donation_drive.id", ondelete="CASCADE"), nullable=False
    )
    drive_need_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("drive_need.id", ondelete="SET NULL"), nullable=True
    )
    reference_no: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    donor_name: Mapped[str] = mapped_column(Text, nullable=False)
    donor_contact: Mapped[str | None] = mapped_column(Text, nullable=True)
    item_name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity_pledged: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_received: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'submitted'"))
    is_walk_in: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    status_changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    status_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(f"status IN {DONATION_STATUSES}", name="donation_status_valid"),
        Index("idx_donation_drive_status", "drive_id", "status"),
    )
