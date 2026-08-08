"""Registry duplicate detection support: trigram index, reference-no sequence, household_merge

Adds what FR-REG-006 (reference number generation) and FR-REG-010 (duplicate
detection + merge) need but 0005_registry_core did not create: a GIN trigram
index on household.head_name (docs/schema.md line 841 already documented this
as planned but it was never migrated), an atomic sequence for reference_no
generation, and the household_merge table (documented in docs/schema.md's
"household_merge — duplicate resolution" section but likewise never migrated
— household.merged_into_id existed as a column with nowhere to record the
merge event itself).

Revision ID: 0007_registry_dup_merge
Revises: 0006_weather
Create Date: 2026-08-08

Refs: FR-REG-006, FR-REG-010
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_registry_dup_merge"
down_revision: str | None = "0006_weather"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX idx_household_head_name_trgm ON household "
        "USING GIN (head_name gin_trgm_ops)"
    )
    op.execute("CREATE SEQUENCE IF NOT EXISTS household_reference_no_seq")

    op.create_table(
        "household_merge",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("kept_household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("merged_household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("merged_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("merged_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "kept_household_id != merged_household_id", name="ck_household_merge_kept_ne_merged"
        ),
        sa.ForeignKeyConstraint(
            ["kept_household_id"],
            ["household.id"],
            name="fk_household_merge_kept_household_id_household",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["merged_household_id"],
            ["household.id"],
            name="fk_household_merge_merged_household_id_household",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["merged_by_user_id"],
            ["user.id"],
            name="fk_household_merge_merged_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_household_merge"),
    )
    op.create_index(
        "idx_household_merge_merged", "household_merge", ["merged_household_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("idx_household_merge_merged", table_name="household_merge")
    op.drop_table("household_merge")
    op.execute("DROP SEQUENCE IF EXISTS household_reference_no_seq")
    op.execute("DROP INDEX IF EXISTS idx_household_head_name_trgm")
