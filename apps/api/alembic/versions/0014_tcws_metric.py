"""add tcws_signal metric to reading_metric_valid constraint

Revision ID: 0014_tcws_metric
Revises: 0013_waterway_proximity
Create Date: 2026-08-10
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0014_tcws_metric"
down_revision: str | None = "0013_waterway_proximity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_METRICS = "('river_level', 'rainfall', 'temperature', 'humidity', 'heat_index', 'precipitation_probability', 'tcws_signal')"
OLD_METRICS = "('river_level', 'rainfall', 'temperature', 'humidity', 'heat_index', 'precipitation_probability')"


def upgrade() -> None:
    op.execute("ALTER TABLE reading DROP CONSTRAINT IF EXISTS ck_reading_ck_reading_reading_metric_valid")
    op.execute("ALTER TABLE reading DROP CONSTRAINT IF EXISTS ck_reading_reading_metric_valid")
    op.execute("ALTER TABLE reading DROP CONSTRAINT IF EXISTS reading_metric_valid")
    op.execute(
        f"ALTER TABLE reading ADD CONSTRAINT ck_reading_reading_metric_valid CHECK (metric IN {NEW_METRICS})"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE reading DROP CONSTRAINT IF EXISTS ck_reading_reading_metric_valid")
    op.execute("ALTER TABLE reading DROP CONSTRAINT IF EXISTS reading_metric_valid")
    op.execute(
        f"ALTER TABLE reading ADD CONSTRAINT ck_reading_reading_metric_valid CHECK (metric IN {OLD_METRICS})"
    )
