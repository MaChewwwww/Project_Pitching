"""Registry core: household, member

Only the two tables needed for real registered-households/members counts on the
public site (FR-ANL-002/003). Nutrition, vulnerability, and feedback are deferred —
see the module docstring in src/modules/registry/models.py.

Transcribed from docs/schema.md Section 5.

Revision ID: 0005_registry_core
Revises: 0004_operations
Create Date: 2026-08-08

Refs: FR-REG-001..011, FR-REG-020..026, FR-ANL-002, FR-ANL-003
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_registry_core"
down_revision: str | None = "0004_operations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "household",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reference_no", sa.Text(), nullable=False),
        sa.Column("head_name", sa.Text(), nullable=False),
        sa.Column("head_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column("is_unreachable_by_phone", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("psgc_barangay_code", sa.String(length=10), nullable=True),
        sa.Column("street_address", sa.Text(), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("stale_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("merged_into_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("source IN ('self', 'bhw')", name="ck_household_household_source_valid"),
        sa.ForeignKeyConstraint(
            ["head_user_id"], ["user.id"], name="fk_household_head_user_id_user", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area.id"], name="fk_household_area_id_area", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["psgc_barangay_code"],
            ["psgc.code"],
            name="fk_household_psgc_barangay_code_psgc",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["user.id"],
            name="fk_household_created_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["verified_by_user_id"],
            ["user.id"],
            name="fk_household_verified_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["merged_into_id"], ["household.id"], name="fk_household_merged_into_id_household", ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_household"),
        sa.UniqueConstraint("reference_no", name="uq_household_reference_no"),
        sa.UniqueConstraint("head_user_id", name="uq_household_head_user_id"),
    )
    op.execute(
        "CREATE INDEX idx_household_area ON household (area_id) WHERE deleted_at IS NULL"
    )
    op.create_index(
        "idx_household_location", "household", ["location"], unique=False, postgresql_using="gist"
    )
    op.execute(
        "CREATE INDEX idx_household_source ON household (source) WHERE deleted_at IS NULL"
    )
    op.create_index("idx_household_head", "household", ["head_user_id"], unique=False)

    op.create_table(
        "member",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("sex", sa.Text(), nullable=True),
        sa.Column("relationship_to_head", sa.Text(), nullable=True),
        sa.Column("is_head", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_child", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_senior", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_pwd", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_pregnant", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_lactating", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("has_chronic_condition", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("chronic_condition_note", sa.Text(), nullable=True),
        sa.Column("is_bedridden", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("sex IS NULL OR sex IN ('male', 'female')", name="ck_member_member_sex_valid"),
        sa.ForeignKeyConstraint(
            ["household_id"], ["household.id"], name="fk_member_household_id_household", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_member"),
    )
    op.execute("CREATE INDEX idx_member_household ON member (household_id) WHERE deleted_at IS NULL")
    op.execute(
        "CREATE UNIQUE INDEX idx_member_one_head ON member (household_id) "
        "WHERE is_head AND deleted_at IS NULL"
    )
    op.execute(
        "CREATE INDEX idx_member_vulnerable ON member (household_id) "
        "WHERE (is_child OR is_senior OR is_pwd OR is_pregnant OR has_chronic_condition OR is_bedridden) "
        "AND deleted_at IS NULL"
    )


def downgrade() -> None:
    op.drop_table("member")
    op.drop_index("idx_household_head", table_name="household")
    op.execute("DROP INDEX IF EXISTS idx_household_source")
    op.drop_index("idx_household_location", table_name="household")
    op.execute("DROP INDEX IF EXISTS idx_household_area")
    op.drop_table("household")
