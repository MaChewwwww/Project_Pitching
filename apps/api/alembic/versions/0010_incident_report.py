"""incident_report

FR-SAF-015/016. `docs/schema.md`'s original column list omitted `created_at`,
`updated_at`, and any dismissal-reason column despite FR-SAF-016 requiring
reports be "marked verified or dismissed **with reason**" — flagged gaps,
fixed here the same way `rescue_request.created_at` was fixed in `0008`.
The `dismissal_reason` CHECK is what makes "with reason" enforceable at the
database level rather than aspirational, mirroring the existing
`chk_alert_needs_instruction` pattern.

Revision ID: 0010_incident_report
Revises: 0009_rescue_priority_manual
Create Date: 2026-08-09

Refs: FR-SAF-015, FR-SAF-016
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_incident_report"
down_revision: str | None = "0009_rescue_priority_manual"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "incident_report",
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
        # Nullable — a report may precede a declared event, same reasoning
        # as rescue_request.event_id in 0008.
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reported_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("location_note", sa.Text(), nullable=True),
        sa.Column("photo_path", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("verified_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissal_reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "type IN ('flooding', 'fire', 'fallen_tree', 'road_blockage', "
            "'landslide', 'power_outage', 'other')",
            name="ck_incident_report_type_valid",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'verified', 'dismissed')",
            name="ck_incident_report_status_valid",
        ),
        sa.CheckConstraint(
            "status <> 'dismissed' OR dismissal_reason IS NOT NULL",
            name="ck_incident_report_dismissal_needs_reason",
        ),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["emergency_event.id"],
            name="fk_incident_report_event_id_emergency_event",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["reported_by_user_id"],
            ["user.id"],
            name="fk_incident_report_reported_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["verified_by_user_id"],
            ["user.id"],
            name="fk_incident_report_verified_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_incident_report"),
    )
    op.create_index("idx_incident_status", "incident_report", ["status", "created_at"])
    op.execute("CREATE INDEX idx_incident_location ON incident_report USING GIST (location)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_incident_location")
    op.drop_index("idx_incident_status", table_name="incident_report")
    op.drop_table("incident_report")
