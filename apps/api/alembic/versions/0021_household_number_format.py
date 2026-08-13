"""Normalize household numbers to the San Jose format.

Revision ID: 0021_household_number_format
Revises: 0020_merge_article_migrations
Create Date: 2026-08-14

Refs: FR-REG-006
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0021_household_number_format"
down_revision: str | None = "0020_merge_article_migrations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Move through unique temporary values first so the existing UNIQUE
    # constraint cannot observe a transient collision during the rewrite.
    op.execute(
        """
        CREATE TEMP TABLE household_number_map ON COMMIT DROP AS
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY created_at, id)::bigint AS sequence_no
        FROM household
        """
    )
    op.execute(
        """
        UPDATE household
        SET reference_no = 'legacy-household-' || id::text
        WHERE id IN (SELECT id FROM household_number_map)
        """
    )
    op.execute(
        """
        UPDATE household AS h
        SET reference_no =
            'M-SJ-' || LPAD((m.sequence_no / 1000)::text, 3, '0') || '-' ||
            LPAD((m.sequence_no % 1000)::text, 3, '0')
        FROM household_number_map AS m
        WHERE h.id = m.id
        """
    )
    op.execute(
        """
        DO $$
        DECLARE max_sequence bigint;
        BEGIN
            SELECT MAX(sequence_no) INTO max_sequence FROM household_number_map;
            IF max_sequence IS NULL THEN
                PERFORM setval('household_reference_no_seq', 1, false);
            ELSE
                PERFORM setval('household_reference_no_seq', max_sequence, true);
            END IF;
        END $$
        """
    )


def downgrade() -> None:
    # Previous values are not retained; the new format is canonical.
    pass
