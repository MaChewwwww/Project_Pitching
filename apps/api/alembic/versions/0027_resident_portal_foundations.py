"""Add resident preparedness, notifications, and authenticated rescue linkage.

Revision ID: 0027_resident_portal_foundations
Revises: 0026_siren_soft_delete
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0027_resident_portal_foundations"
down_revision: str | None = "0026_siren_soft_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rescue_request",
        sa.Column("submitted_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_rescue_request_submitted_by_user_id_user",
        "rescue_request",
        "user",
        ["submitted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_rescue_submitted_by", "rescue_request", ["submitted_by_user_id"])

    op.create_table(
        "go_bag_item",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name_fil", sa.Text(), nullable=False),
        sa.Column("name_en", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("is_essential", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.create_table(
        "go_bag_progress",
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("household.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "go_bag_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("go_bag_item.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("has_item", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_table(
        "family_emergency_plan",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("household.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("meeting_point", sa.Text(), nullable=True),
        sa.Column("out_of_area_contact", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_table(
        "notification",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("link_path", sa.Text(), nullable=True),
        sa.Column("source_type", sa.Text(), nullable=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "type IN ('alert','rescue_update','incident_update','system')",
            name="notification_type_valid",
        ),
    )
    op.create_index(
        "idx_notification_unread",
        "notification",
        ["user_id", sa.text("created_at DESC")],
        postgresql_where=sa.text("read_at IS NULL"),
    )
    op.create_index(
        "uq_notification_source",
        "notification",
        ["user_id", "type", "source_type", "source_id"],
        unique=True,
        postgresql_where=sa.text("source_type IS NOT NULL AND source_id IS NOT NULL"),
    )
    op.execute("""
        INSERT INTO go_bag_item (name_fil, name_en, category, is_essential, sort_order) VALUES
        ('Tubig na maiinom', 'Drinking water', 'Water', true, 1),
        ('Pagkain na hindi madaling masira', 'Shelf-stable food', 'Food', true, 2),
        ('First-aid kit', 'First-aid kit', 'Health', true, 3),
        ('Flashlight at baterya', 'Flashlight and batteries', 'Tools', true, 4),
        ('Gamot at reseta', 'Medicines and prescriptions', 'Health', true, 5),
        ('Mahahalagang dokumento', 'Important documents', 'Documents', true, 6)
    """)


def downgrade() -> None:
    op.drop_index("uq_notification_source", table_name="notification")
    op.drop_index("idx_notification_unread", table_name="notification")
    op.drop_table("notification")
    op.drop_table("family_emergency_plan")
    op.drop_table("go_bag_progress")
    op.drop_table("go_bag_item")
    op.drop_index("idx_rescue_submitted_by", table_name="rescue_request")
    op.drop_constraint(
        "fk_rescue_request_submitted_by_user_id_user", "rescue_request", type_="foreignkey"
    )
    op.drop_column("rescue_request", "submitted_by_user_id")
