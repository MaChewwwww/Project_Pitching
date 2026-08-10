"""flood_event_emergency_link

Adds optional emergency_event_id FK to flood_event table to link declared flood/typhoon
EmergencyEvents automatically to the public flood_event history (FR-WX-013 & FR-SAF-018).

Revision ID: 0017_flood_event_emergency_link
Revises: 0016_evac_checkin
Create Date: 2026-08-11

Refs: FR-WX-013, FR-SAF-018
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0017_flood_event_emergency_link"
down_revision: str | None = "0016_evac_checkin"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "flood_event",
        sa.Column("emergency_event_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_flood_event_emergency_event_id_emergency_event",
        "flood_event",
        "emergency_event",
        ["emergency_event_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_flood_event_emergency_event_id",
        "flood_event",
        ["emergency_event_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_flood_event_emergency_event_id", table_name="flood_event")
    op.drop_constraint(
        "fk_flood_event_emergency_event_id_emergency_event",
        "flood_event",
        type_="foreignkey",
    )
    op.drop_column("flood_event", "emergency_event_id")
