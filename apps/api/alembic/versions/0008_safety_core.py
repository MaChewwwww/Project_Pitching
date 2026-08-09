"""Safety module core: unregistered_person, safety_status, rescue_request

Creates the three FR-SAF tables together because they cross-reference each
other (`safety_status.unregistered_person_id -> unregistered_person`) and
`rescue_request` is needed by the same phase that reads `unregistered_person`.
`safety_status` and `rescue_request` were documented in docs/schema.md but
never migrated — this is the first real implementation.

Two additions beyond the literal schema.md text, both flagged in
docs/frs_nfrs.md and docs/schema.md rather than silently added:
  - `unregistered_person`/`rescue_request` get `created_at`/`updated_at`
    (`rescue_request`'s own `idx_rescue_open` index referenced `created_at`
    without the column ever being listed).
  - Two unique partial indexes on `safety_status` actually enforce "at most
    one current row per subject", which schema.md described in prose only.

Revision ID: 0008_safety_core
Revises: 0007_registry_dup_merge
Create Date: 2026-08-09

Refs: FR-SAF-001..013
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_safety_core"
down_revision: str | None = "0007_registry_dup_merge"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "unregistered_person",
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
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("location_note", sa.Text(), nullable=True),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("converted_household_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["emergency_event.id"],
            name="fk_unregistered_person_event_id_emergency_event",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"],
            ["user.id"],
            name="fk_unregistered_person_recorded_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["converted_household_id"],
            ["household.id"],
            name="fk_unregistered_person_converted_household_id_household",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_unregistered_person"),
    )
    op.create_index("idx_unregistered_event", "unregistered_person", ["event_id"], unique=False)
    op.execute(
        "CREATE INDEX idx_unregistered_location ON unregistered_person "
        "USING GIST (location)"
    )

    op.create_table(
        "safety_status",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("unregistered_person_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("set_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("set_method", sa.Text(), nullable=False),
        sa.Column(
            "set_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('safe', 'needs_rescue', 'unaccounted')",
            name="ck_safety_status_safety_status_status_valid",
        ),
        sa.CheckConstraint(
            "set_method IN ('self', 'assisted', 'household_bulk')",
            name="ck_safety_status_safety_status_set_method_valid",
        ),
        sa.CheckConstraint(
            "num_nonnulls(member_id, unregistered_person_id) = 1",
            name="ck_safety_status_chk_subject_exactly_one",
        ),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["emergency_event.id"],
            name="fk_safety_status_event_id_emergency_event",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["member.id"],
            name="fk_safety_status_member_id_member",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["unregistered_person_id"],
            ["unregistered_person.id"],
            name="fk_safety_status_unregistered_person_id_unregistered_person",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["set_by_user_id"],
            ["user.id"],
            name="fk_safety_status_set_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_safety_status"),
    )
    op.execute(
        "CREATE INDEX idx_safety_event_current ON safety_status (event_id, status) "
        "WHERE superseded_at IS NULL"
    )
    # The two indexes below are the actual enforcement of "at most one current
    # row per subject" (schema.md described the rule in prose only). Without
    # them, two concurrent "safe" writes for one member both succeed and the
    # accounted-for dashboard double-counts.
    op.execute(
        "CREATE UNIQUE INDEX uq_safety_current_member ON safety_status (event_id, member_id) "
        "WHERE superseded_at IS NULL AND member_id IS NOT NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_safety_current_unreg "
        "ON safety_status (event_id, unregistered_person_id) "
        "WHERE superseded_at IS NULL AND unregistered_person_id IS NOT NULL"
    )

    op.create_table(
        "rescue_request",
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
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("requester_name", sa.Text(), nullable=False),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("location_note", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("people_count", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=True),
        sa.Column("vulnerability_level", sa.Text(), nullable=True),
        sa.Column("assigned_to_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("source_ip", postgresql.INET(), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'verified', 'dispatched', 'resolved', 'dismissed')",
            name="ck_rescue_request_rescue_request_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["emergency_event.id"],
            name="fk_rescue_request_event_id_emergency_event",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["household.id"],
            name="fk_rescue_request_household_id_household",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to_user_id"],
            ["user.id"],
            name="fk_rescue_request_assigned_to_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_rescue_request"),
    )
    op.execute(
        "CREATE INDEX idx_rescue_open ON rescue_request (status, priority, created_at) "
        "WHERE status IN ('pending', 'verified', 'dispatched')"
    )
    op.execute("CREATE INDEX idx_rescue_location ON rescue_request USING GIST (location)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_rescue_location")
    op.execute("DROP INDEX IF EXISTS idx_rescue_open")
    op.drop_table("rescue_request")

    op.execute("DROP INDEX IF EXISTS uq_safety_current_unreg")
    op.execute("DROP INDEX IF EXISTS uq_safety_current_member")
    op.execute("DROP INDEX IF EXISTS idx_safety_event_current")
    op.drop_table("safety_status")

    op.execute("DROP INDEX IF EXISTS idx_unregistered_location")
    op.drop_index("idx_unregistered_event", table_name="unregistered_person")
    op.drop_table("unregistered_person")
