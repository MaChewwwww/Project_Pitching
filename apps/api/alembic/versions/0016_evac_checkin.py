"""evac_checkin

FR-EVC-004/005. Table to track check-in and check-out records of residents (both registered household
members and unregistered walk-ins) at evacuation centers during emergency events.

Revision ID: 0016_evac_checkin
Revises: 0015_real_evac_centers
Create Date: 2026-08-10

Refs: FR-EVC-004, FR-EVC-005, FR-SAF-012
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016_evac_checkin"
down_revision: str | None = "0015_real_evac_centers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "evac_checkin",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("evac_center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("unregistered_person_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("person_name", sa.Text(), nullable=False),
        sa.Column(
            "checked_in_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("checked_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["evac_center_id"],
            ["evac_center.id"],
            name="fk_evac_checkin_evac_center_id_evac_center",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["emergency_event.id"],
            name="fk_evac_checkin_event_id_emergency_event",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["member.id"],
            name="fk_evac_checkin_member_id_member",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["unregistered_person_id"],
            ["unregistered_person.id"],
            name="fk_evac_checkin_unregistered_person_id_unregistered_person",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"],
            ["user.id"],
            name="fk_evac_checkin_recorded_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_evac_checkin"),
    )
    op.create_index(
        "idx_checkin_occupancy",
        "evac_checkin",
        ["evac_center_id"],
        postgresql_where=sa.text("checked_out_at IS NULL"),
    )
    op.create_index("idx_checkin_event", "evac_checkin", ["event_id"])
    op.create_index("idx_checkin_member", "evac_checkin", ["member_id"])


def downgrade() -> None:
    op.drop_index("idx_checkin_member", table_name="evac_checkin")
    op.drop_index("idx_checkin_event", table_name="evac_checkin")
    op.drop_index("idx_checkin_occupancy", table_name="evac_checkin")
    op.drop_table("evac_checkin")
