"""merge article CMS migration heads.

Revision ID: 0020_merge_article_migrations
Revises: 0019_remove_announcement_level, 0019_remove_article_image_metadata
Create Date: 2026-08-13

Refs: FR-ALT-014, FR-PUB-020, NFR-MNT-004
"""

from __future__ import annotations

from collections.abc import Sequence


revision: str = "0020_merge_article_migrations"
down_revision: tuple[str, str] = (
    "0019_remove_announcement_level",
    "0019_remove_article_image_metadata",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
