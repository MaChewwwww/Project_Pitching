"""Align siren lifecycle fields with the documented spatial schema.

Revision ID: 0025_asset_lifecycle
Revises: 0024_incident_action_lifecycle
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0025_asset_lifecycle"
down_revision: str | None = "0024_incident_action_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "siren", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true"))
    )
    op.add_column("siren", sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True))
    op.drop_constraint("ck_siren_status_valid", "siren", type_="check")
    op.create_check_constraint(
        "ck_siren_status_valid", "siren", "status IN ('idle', 'sounding', 'testing')"
    )
    op.create_index("idx_siren_area", "siren", ["area_id"])


def downgrade() -> None:
    op.drop_index("idx_siren_area", table_name="siren")
    op.drop_constraint("ck_siren_status_valid", "siren", type_="check")
    op.create_check_constraint(
        "ck_siren_status_valid", "siren", "status IN ('idle', 'sounding')"
    )
    op.drop_column("siren", "last_triggered_at")
    op.drop_column("siren", "is_active")
