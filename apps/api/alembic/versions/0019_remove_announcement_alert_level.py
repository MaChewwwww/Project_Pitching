"""Remove river alert level from announcement articles.

Revision ID: 0019_remove_announcement_level
Revises: 0018_article_cms
Create Date: 2026-08-12

Refs: FR-ALT-001, FR-ALT-004, FR-ALT-013
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019_remove_announcement_level"
down_revision: str | None = "0018_article_cms"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_announcement_announcement_alert_level_valid",
        "announcement",
        type_="check",
    )
    op.drop_column("announcement", "alert_level")


def downgrade() -> None:
    op.add_column("announcement", sa.Column("alert_level", sa.SmallInteger(), nullable=True))
    op.create_check_constraint(
        "ck_announcement_announcement_alert_level_valid",
        "announcement",
        "alert_level IS NULL OR alert_level IN (1, 2, 3)",
    )
