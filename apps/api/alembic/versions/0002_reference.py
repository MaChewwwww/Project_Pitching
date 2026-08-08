"""Reference data: hotlines, facilities; area.geom becomes nullable

Adds the two remaining FR-SYS-013/014/015 reference tables and relaxes
`area.geom` so an area row can exist before BRD OI-3 supplies boundary polygons —
without this, no household/facility/activity/announcement targeting can be seeded
at all, because they all FK to `area`.

Transcribed from docs/schema.md Section 4.

Revision ID: 0002_reference
Revises: 0001_foundation
Create Date: 2026-08-08

Refs: FR-SYS-013, FR-SYS-014, FR-SYS-015, FR-MAP-005, FR-MAP-006
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_reference"
down_revision: str | None = "0001_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- area.geom → nullable (schema.md Section 4) -------------------------
    # Pending BRD OI-3. Null means "boundary not yet supplied", never "no area".
    op.alter_column("area", "geom", nullable=True)

    # --- hotline (FR-SYS-014) ------------------------------------------------
    op.create_table(
        "hotline",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("number", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.CheckConstraint(
            "type IN ('barangay', 'police', 'fire', 'ambulance', 'hospital', 'rescue', 'mdrrmo')",
            name="ck_hotline_hotline_type_valid",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_hotline"),
    )

    # --- facility (FR-SYS-015) -----------------------------------------------
    op.create_table(
        "facility",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "type IN ('evacuation_center', 'hospital', 'clinic', 'barangay_hall', "
            "'police', 'fire', 'rescue_station')",
            name="ck_facility_facility_type_valid",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area.id"], name="fk_facility_area_id_area", ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_facility"),
    )
    op.create_index(
        "idx_facility_location", "facility", ["location"], unique=False, postgresql_using="gist"
    )
    op.execute("CREATE INDEX idx_facility_type ON facility (type) WHERE is_active")


def downgrade() -> None:
    op.drop_index("idx_facility_location", table_name="facility")
    op.execute("DROP INDEX IF EXISTS idx_facility_type")
    op.drop_table("facility")
    op.drop_table("hotline")
    op.alter_column("area", "geom", nullable=False)
