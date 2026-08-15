"""Add FR-SAF-021 incident response lifecycle.

Revision ID: 0024_incident_action_lifecycle
Revises: 0023_concurrent_ops
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0024_incident_action_lifecycle"
down_revision: str | None = "0023_concurrent_ops"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "incident_report", sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("incident_report", sa.Column("resolution_note", sa.Text(), nullable=True))
    op.drop_constraint("ck_incident_report_type_valid", "incident_report", type_="check")
    op.drop_constraint("ck_incident_report_status_valid", "incident_report", type_="check")
    op.drop_constraint(
        "ck_incident_report_dismissal_needs_reason", "incident_report", type_="check"
    )
    op.create_check_constraint(
        "ck_incident_report_type_valid",
        "incident_report",
        (
            "type IN ('flooding', 'fire', 'fallen_tree', 'road_blockage', "
            "'landslide', 'power_outage', 'other')"
        ),
    )
    op.create_check_constraint(
        "ck_incident_report_status_valid",
        "incident_report",
        "status IN ('pending', 'verified', 'in_progress', 'resolved', 'dismissed')",
    )
    op.create_check_constraint(
        "ck_incident_report_dismissal_needs_reason",
        "incident_report",
        "status <> 'dismissed' OR dismissal_reason IS NOT NULL",
    )
    op.create_check_constraint(
        "ck_incident_report_resolution_needs_note",
        "incident_report",
        "status <> 'resolved' OR (resolved_at IS NOT NULL AND resolution_note IS NOT NULL)",
    )


def downgrade() -> None:
    op.execute(
        "UPDATE incident_report SET status = 'verified' WHERE status IN ('in_progress', 'resolved')"
    )
    op.drop_constraint("ck_incident_report_resolution_needs_note", "incident_report", type_="check")
    op.drop_constraint(
        "ck_incident_report_dismissal_needs_reason", "incident_report", type_="check"
    )
    op.drop_constraint("ck_incident_report_status_valid", "incident_report", type_="check")
    op.drop_constraint("ck_incident_report_type_valid", "incident_report", type_="check")
    op.create_check_constraint(
        "ck_incident_report_type_valid",
        "incident_report",
        (
            "type IN ('flooding', 'fire', 'fallen_tree', 'road_blockage', "
            "'landslide', 'power_outage', 'other')"
        ),
    )
    op.create_check_constraint(
        "ck_incident_report_status_valid",
        "incident_report",
        "status IN ('pending', 'verified', 'dismissed')",
    )
    op.create_check_constraint(
        "ck_incident_report_dismissal_needs_reason",
        "incident_report",
        "status <> 'dismissed' OR dismissal_reason IS NOT NULL",
    )
    op.drop_column("incident_report", "resolution_note")
    op.drop_column("incident_report", "resolved_at")
