"""Foundation: extensions and the platform tables

Enables the four required PostgreSQL extensions and creates the tables every other
module builds on: identity, BHW area scoping, sessions, audit, configuration,
PSGC reference data, and barangay areas.

Transcribed from docs/schema.md Sections 3, 4, and 13. The remaining 30 tables land
in their own FR-mapped migrations.

Revision ID: 0001_foundation
Revises:
Create Date: 2026-08-07

Refs: NFR-MNT-004, FR-SYS-005, FR-SYS-007, FR-SYS-008, FR-SYS-010, FR-SYS-012, FR-SYS-013
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_foundation"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- extensions (schema.md Section 13) ----------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")  # spatial types and functions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")  # gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")  # case-insensitive email
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")  # fuzzy name matching (FR-REG-010)

    # --- user (FR-SYS-005) --------------------------------------------------
    op.create_table(
        "user",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("contact_number", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "role IN ('head', 'bhw', 'admin', 'sk', 'superadmin')",
            name="ck_user_user_role_valid",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'active', 'disabled')",
            name="ck_user_user_status_valid",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user"),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    op.create_index(
        "idx_user_role_status",
        "user",
        ["role", "status"],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # --- area (FR-SYS-013) --------------------------------------------------
    # Created before user_area, which references it. Boundary polygons themselves
    # are still blocked on BRD OI-3 — the table exists, the rows do not.
    op.create_table(
        "area",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(
                geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False
            ),
            nullable=False,
        ),
        sa.Column(
            "centroid",
            geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("flood_exposure", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "flood_exposure IS NULL OR flood_exposure IN ('low', 'medium', 'high')",
            name="ck_area_area_flood_exposure_valid",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_area"),
        sa.UniqueConstraint("name", name="uq_area_name"),
        sa.UniqueConstraint("code", name="uq_area_code"),
    )
    # GiST. Every ST_Contains in the system hits this index.
    op.create_index("idx_area_geom", "area", ["geom"], unique=False, postgresql_using="gist")

    # --- user_area — BHW scoping (FR-SYS-007) -------------------------------
    op.create_table(
        "user_area",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], name="fk_user_area_user_id_user", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["area.id"], name="fk_user_area_area_id_area", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", "area_id", name="pk_user_area"),
    )

    # --- refresh_token (FR-SYS-002, FR-SYS-003) -----------------------------
    op.create_table(
        "refresh_token",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], name="fk_refresh_token_user_id_user", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_token"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_token_token_hash"),
    )
    op.create_index(
        "idx_refresh_user_active",
        "refresh_token",
        ["user_id"],
        unique=False,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    # --- password_reset_token (FR-SYS-004) ----------------------------------
    op.create_table(
        "password_reset_token",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            name="fk_password_reset_token_user_id_user",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_password_reset_token"),
        sa.UniqueConstraint("token_hash", name="uq_password_reset_token_token_hash"),
    )

    # --- audit_log (FR-SYS-008) ---------------------------------------------
    # Append-only. No update or delete path exists in the application.
    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("changes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["user.id"],
            name="fk_audit_log_actor_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_audit_log"),
    )
    op.execute(
        "CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id, created_at DESC)"
    )
    op.execute("CREATE INDEX idx_audit_actor ON audit_log (actor_user_id, created_at DESC)")

    # --- config (FR-SYS-010, FR-ANL-002) ------------------------------------
    op.create_table(
        "config",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["user.id"],
            name="fk_config_updated_by_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("key", name="pk_config"),
    )

    # --- psgc (FR-SYS-012) --------------------------------------------------
    op.create_table(
        "psgc",
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("level", sa.String(length=10), nullable=False),
        sa.Column("parent_code", sa.String(length=10), nullable=True),
        sa.CheckConstraint(
            "level IN ('region', 'province', 'city', 'barangay')",
            name="ck_psgc_psgc_level_valid",
        ),
        sa.ForeignKeyConstraint(
            ["parent_code"], ["psgc.code"], name="fk_psgc_parent_code_psgc", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("code", name="pk_psgc"),
    )

    _seed_config_defaults()


def _seed_config_defaults() -> None:
    """Config keys from schema.md Section 4.

    Values that are still open items are inserted as NULL rather than guessed —
    a wrong alert threshold is worse than an obviously missing one, and the admin
    UI can show "not set" (FR-SYS-010).
    """
    op.execute(
        """
        INSERT INTO config (key, value, description) VALUES
          ('barangay.total_population', '143031'::jsonb,
           'Barangay-wide population. Configured, never derived (FR-ANL-003).'),
          ('barangay.total_households', 'null'::jsonb,
           'Barangay-wide household count. Awaiting the LGU figure (BRD OI-12).'),
          ('alert.threshold_level_1_m', 'null'::jsonb,
           'River level in metres for Level 1 Prepare. Awaiting MDRRMO (BRD OI-4).'),
          ('alert.threshold_level_2_m', 'null'::jsonb,
           'River level in metres for Level 2 Evacuate. Awaiting MDRRMO (BRD OI-4).'),
          ('alert.threshold_level_3_m', 'null'::jsonb,
           'River level in metres for Level 3 Forced Evacuation. Awaiting MDRRMO (BRD OI-4).'),
          ('reading.stale_after_minutes', '45'::jsonb,
           'A reading older than this renders as stale (FR-WX-011).'),
          ('weather.latitude', '14.735'::jsonb,
           'Open-Meteo poll coordinate — Barangay San Jose, Rodriguez, Rizal.'),
          ('weather.longitude', '121.135'::jsonb,
           'Open-Meteo poll coordinate — Barangay San Jose, Rodriguez, Rizal.')
        ON CONFLICT (key) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("psgc")
    op.drop_table("config")
    op.drop_index("idx_audit_actor", table_name="audit_log")
    op.drop_index("idx_audit_entity", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_table("password_reset_token")
    op.drop_index("idx_refresh_user_active", table_name="refresh_token")
    op.drop_table("refresh_token")
    op.drop_table("user_area")
    op.drop_index("idx_area_geom", table_name="area")
    op.drop_table("area")
    op.drop_index("idx_user_role_status", table_name="user")
    op.drop_table("user")

    # Extensions are deliberately not dropped. Another database in the same cluster
    # may rely on them, and re-creating PostGIS is expensive.
