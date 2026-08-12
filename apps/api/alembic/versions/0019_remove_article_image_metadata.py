"""remove article-image alt text and captions.

Revision ID: 0019_remove_article_image_metadata
Revises: 0018_article_cms
Create Date: 2026-08-13

Refs: FR-ALT-014, FR-PUB-020, FR-ACT-011, FR-DON-015, NFR-UX-011
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0019_remove_article_image_metadata"
down_revision: str | None = "0018_article_cms"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


IMAGE_TABLES = ("announcement_image", "activity_image", "donation_drive_image")


def upgrade() -> None:
    for table in IMAGE_TABLES:
        op.drop_column(table, "caption")
        op.drop_column(table, "alt_text")


def downgrade() -> None:
    for table in IMAGE_TABLES:
        op.add_column(table, sa.Column("alt_text", sa.Text(), server_default=sa.text("''"), nullable=False))
        op.add_column(table, sa.Column("caption", sa.Text(), nullable=True))
