"""Content tables: announcements, activities, guides, faqs

Transcribed from docs/schema.md Sections 6, 10, 11.

Revision ID: 0003_content
Revises: 0002_reference
Create Date: 2026-08-08

Refs: FR-ALT-001..011, FR-ACT-001..003, FR-PRP-001, FR-PRP-003, FR-PRP-004,
      FR-PRP-005, FR-PRP-007, FR-PUB-005, FR-PUB-011
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_content"
down_revision: str | None = "0002_reference"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- announcement (FR-ALT-001..011) --------------------------------------
    op.create_table(
        "announcement",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=True),
        sa.Column("alert_level", sa.SmallInteger(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=True),
        sa.Column("is_barangay_wide", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issued_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("kind IN ('announcement', 'alert')", name="ck_announcement_announcement_kind_valid"),
        sa.CheckConstraint(
            "type IN ('general', 'class_suspension', 'road_closure', 'utility_interruption', "
            "'flood_warning', 'earthquake', 'typhoon', 'heavy_rainfall', 'heat_index', 'evacuation')",
            name="ck_announcement_announcement_type_valid",
        ),
        sa.CheckConstraint(
            "severity IS NULL OR severity IN ('info', 'warning', 'emergency')",
            name="ck_announcement_announcement_severity_valid",
        ),
        sa.CheckConstraint(
            "alert_level IS NULL OR alert_level IN (1, 2, 3)",
            name="ck_announcement_announcement_alert_level_valid",
        ),
        sa.CheckConstraint(
            "kind <> 'alert' OR instruction IS NOT NULL", name="ck_announcement_alert_needs_instruction"
        ),
        sa.ForeignKeyConstraint(
            ["issued_by_user_id"],
            ["user.id"],
            name="fk_announcement_issued_by_user_id_user",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_announcement"),
    )
    op.execute(
        "CREATE INDEX idx_announcement_active ON announcement (kind, published_at DESC) "
        "WHERE deactivated_at IS NULL"
    )

    # --- announcement_area (FR-ALT-003) --------------------------------------
    op.create_table(
        "announcement_area",
        sa.Column("announcement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["announcement_id"],
            ["announcement.id"],
            name="fk_announcement_area_announcement_id_announcement",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area.id"], name="fk_announcement_area_area_id_area", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("announcement_id", "area_id", name="pk_announcement_area"),
    )

    # --- activity (FR-ACT-001..003) ------------------------------------------
    op.create_table(
        "activity",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("venue", sa.Text(), nullable=True),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "type IN ('drill', 'seminar', 'first_aid', 'cleanup', 'tree_planting', 'ngo_program', 'other')",
            name="ck_activity_activity_type_valid",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area.id"], name="fk_activity_area_id_area", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["user.id"],
            name="fk_activity_created_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_activity"),
    )

    # --- guide (FR-PRP-001, 003, 004, 007) ------------------------------------
    op.create_table(
        "guide",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("hazard_type", sa.Text(), nullable=False),
        sa.Column("title_fil", sa.Text(), nullable=False),
        sa.Column("title_en", sa.Text(), nullable=False),
        sa.Column("body_fil", sa.Text(), nullable=False),
        sa.Column("body_en", sa.Text(), nullable=False),
        sa.Column("phase", sa.Text(), server_default="n/a", nullable=False),
        sa.Column("source_attribution", sa.Text(), nullable=True),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.CheckConstraint(
            "hazard_type IN ('flood', 'earthquake', 'typhoon', 'fire', 'landslide', 'general', 'food')",
            name="ck_guide_guide_hazard_type_valid",
        ),
        sa.CheckConstraint(
            "phase IN ('before', 'during', 'after', 'n/a')", name="ck_guide_guide_phase_valid"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_guide"),
        sa.UniqueConstraint("slug", name="uq_guide_slug"),
    )

    # --- faq (FR-PRP-005, FR-PUB-011) -----------------------------------------
    op.create_table(
        "faq",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("question_fil", sa.Text(), nullable=False),
        sa.Column("question_en", sa.Text(), nullable=False),
        sa.Column("answer_fil", sa.Text(), nullable=False),
        sa.Column("answer_en", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_faq"),
    )


def downgrade() -> None:
    op.drop_table("faq")
    op.drop_table("guide")
    op.drop_table("activity")
    op.drop_table("announcement_area")
    op.execute("DROP INDEX IF EXISTS idx_announcement_active")
    op.drop_table("announcement")
