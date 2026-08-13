"""Store optional contact numbers for registered citizens.

Revision ID: 0022_member_contact_number
Revises: 0021_household_number_format
Create Date: 2026-08-14

Refs: FR-REG-002, FR-REG-020
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0022_member_contact_number"
down_revision: str | None = "0021_household_number_format"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("member", sa.Column("contact_number", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("member", "contact_number")
