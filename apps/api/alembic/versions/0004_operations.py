"""Operations tables: emergency events, evacuation centres, donation drives

Transcribed from docs/schema.md Sections 7 (partial), 8, 9.

Revision ID: 0004_operations
Revises: 0003_content
Create Date: 2026-08-08

Refs: FR-EVC-001..003, FR-EVC-008, FR-DON-001..010
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_operations"
down_revision: str | None = "0003_content"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- emergency_event ------------------------------------------------------
    op.create_table(
        "emergency_event",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("declared_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "type IN ('flood', 'earthquake', 'typhoon', 'fire', 'other')",
            name="ck_emergency_event_emergency_event_type_valid",
        ),
        sa.ForeignKeyConstraint(
            ["declared_by_user_id"],
            ["user.id"],
            name="fk_emergency_event_declared_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_emergency_event"),
    )
    op.execute(
        "CREATE UNIQUE INDEX idx_one_active_event ON emergency_event ((true)) WHERE is_active"
    )

    # --- evac_center (FR-EVC-001..003, 008) -----------------------------------
    op.create_table(
        "evac_center",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("contact_person", sa.Text(), nullable=True),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column("is_open", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["facility_id"], ["facility.id"], name="fk_evac_center_facility_id_facility", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_evac_center"),
        sa.UniqueConstraint("facility_id", name="uq_evac_center_facility_id"),
    )

    # --- donation_drive (FR-DON-001, 009) -------------------------------------
    op.create_table(
        "donation_drive",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default="open", nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint("status IN ('open', 'closed')", name="ck_donation_drive_donation_drive_status_valid"),
        sa.ForeignKeyConstraint(
            ["event_id"], ["emergency_event.id"], name="fk_donation_drive_event_id_emergency_event", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["user.id"],
            name="fk_donation_drive_created_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_donation_drive"),
    )

    # --- drive_need ------------------------------------------------------------
    op.create_table(
        "drive_need",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("drive_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_name", sa.Text(), nullable=False),
        sa.Column("target_quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(
            ["drive_id"], ["donation_drive.id"], name="fk_drive_need_drive_id_donation_drive", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_drive_need"),
    )

    # --- donation (FR-DON-002..008) ---------------------------------------------
    op.create_table(
        "donation",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("drive_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("drive_need_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reference_no", sa.Text(), nullable=False),
        sa.Column("donor_name", sa.Text(), nullable=False),
        sa.Column("donor_contact", sa.Text(), nullable=True),
        sa.Column("item_name", sa.Text(), nullable=False),
        sa.Column("quantity_pledged", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity_received", sa.Numeric(10, 2), nullable=True),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="submitted", nullable=False),
        sa.Column("is_walk_in", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status_changed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('submitted', 'received', 'partially_received', 'not_fulfilled')",
            name="ck_donation_donation_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["drive_id"], ["donation_drive.id"], name="fk_donation_drive_id_donation_drive", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["drive_need_id"], ["drive_need.id"], name="fk_donation_drive_need_id_drive_need", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["status_changed_by_user_id"],
            ["user.id"],
            name="fk_donation_status_changed_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_donation"),
        sa.UniqueConstraint("reference_no", name="uq_donation_reference_no"),
    )
    op.create_index("idx_donation_drive_status", "donation", ["drive_id", "status"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_donation_drive_status", table_name="donation")
    op.drop_table("donation")
    op.drop_table("drive_need")
    op.drop_table("donation_drive")
    op.drop_table("evac_center")
    op.execute("DROP INDEX IF EXISTS idx_one_active_event")
    op.drop_table("emergency_event")
