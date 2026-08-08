"""Weather & alerts: reading, forecast, flood_event(_area), alert_prompt

Also seeds the three river alert thresholds with the PAGASA FFWS Montalban gauge's
own published alert/alarm/critical values, confirmed live against
`GET /water/map_list.do` (tech_stack.md Section 7, schema.md S-OI-3). These are the
gauge operator's own numbers, not an invented guess — admin-editable the moment
MDRRMO supplies a locally-confirmed figure (BRD OI-4 stays open).

Transcribed from docs/schema.md Section 6.

Revision ID: 0006_weather
Revises: 0005_registry_core
Create Date: 2026-08-08

Refs: FR-WX-001..013, FR-ALT-012 (alert_prompt only; siren itself is map-scope)
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_weather"
down_revision: str | None = "0005_registry_core"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

METRICS_CHECK = (
    "metric IN ('river_level', 'rainfall', 'temperature', 'humidity', "
    "'heat_index', 'precipitation_probability')"
)


def upgrade() -> None:
    # --- reading (FR-WX-001..012) ---------------------------------------------
    op.create_table(
        "reading",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("metric", sa.Text(), nullable=False),
        sa.Column("value", sa.Numeric(10, 3), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("station", sa.Text(), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("entered_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint(
            "source IN ('open_meteo', 'pagasa', 'manual')", name="ck_reading_reading_source_valid"
        ),
        sa.CheckConstraint(METRICS_CHECK, name="ck_reading_reading_metric_valid"),
        sa.ForeignKeyConstraint(
            ["entered_by_user_id"],
            ["user.id"],
            name="fk_reading_entered_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_reading"),
    )
    op.create_index(
        "idx_reading_latest", "reading", ["metric", "source", sa.text("observed_at DESC")], unique=False
    )

    # --- forecast (FR-WX-002, 015) ---------------------------------------------
    op.create_table(
        "forecast",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("metric", sa.Text(), nullable=False),
        sa.Column("value", sa.Numeric(10, 3), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("valid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("horizon", sa.Text(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.CheckConstraint("source IN ('open_meteo', 'pagasa')", name="ck_forecast_forecast_source_valid"),
        sa.CheckConstraint(METRICS_CHECK, name="ck_forecast_forecast_metric_valid"),
        sa.CheckConstraint("horizon IN ('hourly', 'daily')", name="ck_forecast_forecast_horizon_valid"),
        sa.PrimaryKeyConstraint("id", name="pk_forecast"),
        sa.UniqueConstraint("source", "metric", "horizon", "valid_at", name="uq_forecast_point"),
    )
    op.create_index("idx_forecast_upcoming", "forecast", ["metric", "horizon", "valid_at"], unique=False)

    # --- flood_event (FR-WX-013) ------------------------------------------------
    op.create_table(
        "flood_event",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("peak_level_m", sa.Numeric(10, 3), nullable=True),
        sa.Column("peak_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("households_displaced", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_flood_event"),
    )

    op.create_table(
        "flood_event_area",
        sa.Column("flood_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["flood_event_id"],
            ["flood_event.id"],
            name="fk_flood_event_area_flood_event_id_flood_event",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area.id"], name="fk_flood_event_area_area_id_area", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("flood_event_id", "area_id", name="pk_flood_event_area"),
    )

    # --- alert_prompt (FR-WX-009) ------------------------------------------------
    op.create_table(
        "alert_prompt",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reading_id", sa.BigInteger(), nullable=True),
        sa.Column("level", sa.SmallInteger(), nullable=False),
        sa.Column("threshold_value", sa.Numeric(10, 3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("acknowledged_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resulted_in_announcement_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint("level IN (1, 2, 3)", name="ck_alert_prompt_alert_prompt_level_valid"),
        sa.ForeignKeyConstraint(
            ["reading_id"], ["reading.id"], name="fk_alert_prompt_reading_id_reading", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["acknowledged_by_user_id"],
            ["user.id"],
            name="fk_alert_prompt_acknowledged_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["resulted_in_announcement_id"],
            ["announcement.id"],
            name="fk_alert_prompt_resulted_in_announcement_id_announcement",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_alert_prompt"),
    )

    # --- thresholds: Montalban gauge's own published values (schema.md S-OI-3) --
    op.execute(
        """
        UPDATE config SET
          value = '22.40'::jsonb,
          description = 'River level in metres for Level 1 Prepare. '
                         'PAGASA Montalban gauge published value — pending MDRRMO confirmation (BRD OI-4).'
        WHERE key = 'alert.threshold_level_1_m'
        """
    )
    op.execute(
        """
        UPDATE config SET
          value = '23.00'::jsonb,
          description = 'River level in metres for Level 2 Evacuate. '
                         'PAGASA Montalban gauge published value — pending MDRRMO confirmation (BRD OI-4).'
        WHERE key = 'alert.threshold_level_2_m'
        """
    )
    op.execute(
        """
        UPDATE config SET
          value = '23.60'::jsonb,
          description = 'River level in metres for Level 3 Forced Evacuation. '
                         'PAGASA Montalban gauge published value — pending MDRRMO confirmation (BRD OI-4).'
        WHERE key = 'alert.threshold_level_3_m'
        """
    )


def downgrade() -> None:
    op.execute(
        "UPDATE config SET value = 'null'::jsonb, "
        "description = 'River level in metres for Level 1 Prepare. Awaiting MDRRMO (BRD OI-4).' "
        "WHERE key = 'alert.threshold_level_1_m'"
    )
    op.execute(
        "UPDATE config SET value = 'null'::jsonb, "
        "description = 'River level in metres for Level 2 Evacuate. Awaiting MDRRMO (BRD OI-4).' "
        "WHERE key = 'alert.threshold_level_2_m'"
    )
    op.execute(
        "UPDATE config SET value = 'null'::jsonb, "
        "description = 'River level in metres for Level 3 Forced Evacuation. Awaiting MDRRMO (BRD OI-4).' "
        "WHERE key = 'alert.threshold_level_3_m'"
    )
    op.drop_table("alert_prompt")
    op.drop_table("flood_event_area")
    op.drop_table("flood_event")
    op.drop_index("idx_forecast_upcoming", table_name="forecast")
    op.drop_table("forecast")
    op.drop_index("idx_reading_latest", table_name="reading")
    op.drop_table("reading")
