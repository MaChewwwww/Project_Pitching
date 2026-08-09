"""siren table (FR-MAP-014)

Manual-trigger siren unit. An officer pins one on the map and can manually
toggle its status between 'idle' and 'sounding'. There is no automatic trigger
and no physical hardware interface — the 'sounding' status is a simulation for
demo purposes. See AGENTS.md and SAF_MAP_IMPLEMENTATION.md M4 for rationale.

Revision ID: 0012_siren
Revises: 0011_area_boundaries
Create Date: 2026-08-09

Refs: FR-MAP-014
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_siren"
down_revision: str | None = "0011_area_boundaries"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "siren",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("status", sa.String(10), server_default=sa.text("'idle'"), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('idle', 'sounding')",
            name="ck_siren_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"],
            ["area.id"],
            name="fk_siren_area_id_area",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_siren"),
    )
    op.execute("CREATE INDEX idx_siren_location ON siren USING GIST (location)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_siren_location")
    op.drop_table("siren")
