"""household waterway proximity (BR-1.6 & FR-REG-001)

Adds waterway_proximity column to household table ('very_near', 'near', 'far').

Revision ID: 0013_waterway_proximity
Revises: 0012_siren
Create Date: 2026-08-10
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013_waterway_proximity"
down_revision: str | None = "0012_siren"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("household", sa.Column("waterway_proximity", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("household", "waterway_proximity")
