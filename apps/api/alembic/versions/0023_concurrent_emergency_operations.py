"""Concurrent emergency operations and physical occupancy invariants.

Revision ID: 0023_concurrent_ops
Revises: 0022_member_contact_number
Create Date: 2026-08-14

Refs: FR-SAF-014, FR-SAF-018, FR-SAF-019, FR-SAF-020, FR-EVC-002,
FR-EVC-004, FR-EVC-005
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0023_concurrent_ops"
down_revision: str | None = "0022_member_contact_number"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_one_active_event")

    for column in (
        "is_child",
        "is_senior",
        "is_pwd",
        "is_pregnant",
        "is_lactating",
        "has_chronic_condition",
        "is_bedridden",
    ):
        op.add_column(
            "unregistered_person",
            sa.Column(column, sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )
    op.add_column(
        "unregistered_person", sa.Column("chronic_condition_note", sa.Text(), nullable=True)
    )
    op.add_column(
        "unregistered_person",
        sa.Column("converted_member_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_unregistered_person_converted_member_id_member",
        "unregistered_person",
        "member",
        ["converted_member_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Preserve legacy station rows recorded by name only: promote each one to
    # an auditable unregistered-person identity before enforcing the subject
    # invariant. If an old row somehow carries both identities, the official
    # member link wins.
    op.execute(
        """
        UPDATE evac_checkin
        SET unregistered_person_id = NULL
        WHERE member_id IS NOT NULL AND unregistered_person_id IS NOT NULL
        """
    )
    op.execute(
        """
        WITH orphan AS MATERIALIZED (
          SELECT id AS checkin_id, gen_random_uuid() AS person_id, event_id,
                 person_name, recorded_by_user_id, created_at
          FROM evac_checkin
          WHERE member_id IS NULL AND unregistered_person_id IS NULL
        ), inserted AS (
          INSERT INTO unregistered_person (
            id, event_id, full_name, recorded_by_user_id, created_at, updated_at
          )
          SELECT person_id, event_id, person_name, recorded_by_user_id, created_at, created_at
          FROM orphan
          RETURNING id
        )
        UPDATE evac_checkin AS checkin
        SET unregistered_person_id = orphan.person_id
        FROM orphan JOIN inserted ON inserted.id = orphan.person_id
        WHERE checkin.id = orphan.checkin_id
        """
    )

    op.create_check_constraint(
        "chk_evac_checkin_subject_exactly_one",
        "evac_checkin",
        "num_nonnulls(member_id, unregistered_person_id) = 1",
    )
    # Older event-scoped rows may leave the same person open in more than one
    # event. Keep the newest physical assignment and close the duplicates so
    # the global one-person/one-place indexes can be installed safely.
    op.execute(
        """
        WITH ranked AS (
          SELECT id,
                 row_number() OVER (
                   PARTITION BY member_id
                   ORDER BY checked_in_at DESC, created_at DESC, id DESC
                 ) AS position
          FROM evac_checkin
          WHERE checked_out_at IS NULL AND member_id IS NOT NULL
        )
        UPDATE evac_checkin AS checkin
        SET checked_out_at = checkin.checked_in_at,
            updated_at = GREATEST(checkin.updated_at, checkin.checked_in_at)
        FROM ranked
        WHERE checkin.id = ranked.id AND ranked.position > 1
        """
    )
    op.execute(
        """
        WITH ranked AS (
          SELECT id,
                 row_number() OVER (
                   PARTITION BY unregistered_person_id
                   ORDER BY checked_in_at DESC, created_at DESC, id DESC
                 ) AS position
          FROM evac_checkin
          WHERE checked_out_at IS NULL AND unregistered_person_id IS NOT NULL
        )
        UPDATE evac_checkin AS checkin
        SET checked_out_at = checkin.checked_in_at,
            updated_at = GREATEST(checkin.updated_at, checkin.checked_in_at)
        FROM ranked
        WHERE checkin.id = ranked.id AND ranked.position > 1
        """
    )
    op.create_index(
        "uq_evac_checkin_open_member",
        "evac_checkin",
        ["member_id"],
        unique=True,
        postgresql_where=sa.text("checked_out_at IS NULL AND member_id IS NOT NULL"),
    )
    op.create_index(
        "uq_evac_checkin_open_unregistered",
        "evac_checkin",
        ["unregistered_person_id"],
        unique=True,
        postgresql_where=sa.text("checked_out_at IS NULL AND unregistered_person_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_evac_checkin_open_unregistered", table_name="evac_checkin")
    op.drop_index("uq_evac_checkin_open_member", table_name="evac_checkin")
    op.drop_constraint("chk_evac_checkin_subject_exactly_one", "evac_checkin", type_="check")
    op.drop_constraint(
        "fk_unregistered_person_converted_member_id_member",
        "unregistered_person",
        type_="foreignkey",
    )
    op.drop_column("unregistered_person", "converted_member_id")
    op.drop_column("unregistered_person", "chronic_condition_note")
    for column in (
        "is_bedridden",
        "has_chronic_condition",
        "is_lactating",
        "is_pregnant",
        "is_pwd",
        "is_senior",
        "is_child",
    ):
        op.drop_column("unregistered_person", column)

    # The legacy constraint permits only one active row. Preserve the newest
    # event and end any other active events before restoring its index.
    op.execute(
        """
        WITH ranked AS (
          SELECT id,
                 row_number() OVER (ORDER BY started_at DESC, id DESC) AS position
          FROM emergency_event
          WHERE is_active
        )
        UPDATE emergency_event AS event
        SET is_active = false,
            ended_at = COALESCE(event.ended_at, now())
        FROM ranked
        WHERE event.id = ranked.id AND ranked.position > 1
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX idx_one_active_event ON emergency_event ((true)) WHERE is_active"
    )
