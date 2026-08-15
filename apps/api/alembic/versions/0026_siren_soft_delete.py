"""Add soft delete support to siren table.

Revision ID: 0026_siren_soft_delete
Revises: 0025_asset_lifecycle
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "0026_siren_soft_delete"
down_revision: str | None = "0025_asset_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "siren", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        "idx_siren_deleted_at", "siren", ["deleted_at"], postgresql_where=sa.text("deleted_at IS NULL")
    )


def downgrade() -> None:
    op.drop_index("idx_siren_deleted_at", table_name="siren")
    op.drop_column("siren", "deleted_at")
