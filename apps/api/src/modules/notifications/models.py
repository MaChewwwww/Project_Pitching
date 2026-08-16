from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, UUIDPrimaryKeyMixin

NOTIFICATION_TYPES = ("alert", "rescue_update", "incident_update", "system")


class Notification(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "notification"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    link_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        CheckConstraint(f"type IN {NOTIFICATION_TYPES}", name="notification_type_valid"),
        Index(
            "idx_notification_unread",
            "user_id",
            text("created_at DESC"),
            postgresql_where=text("read_at IS NULL"),
        ),
        Index(
            "uq_notification_source",
            "user_id",
            "type",
            "source_type",
            "source_id",
            unique=True,
            postgresql_where=text("source_type IS NOT NULL AND source_id IS NOT NULL"),
        ),
    )
