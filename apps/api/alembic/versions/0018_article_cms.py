"""article CMS and retirement of donation transactions.

Revision ID: 0018_article_cms
Revises: 0017_flood_event_emergency_link
Create Date: 2026-08-12

Refs: FR-PUB-019, FR-PUB-020, FR-ALT-013..015, FR-ACT-010..012,
      FR-DON-015..017, NFR-SEC-013, NFR-DAT-008
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0018_article_cms"
down_revision: str | None = "0017_flood_event_emergency_link"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _slug(value: str, used: set[str]) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-") or "article"
    candidate, number = base, 2
    while candidate in used:
        candidate = f"{base}-{number}"
        number += 1
    used.add(candidate)
    return candidate


def _document(value: str | None) -> dict[str, object]:
    text = (value or "").strip()
    paragraph: dict[str, object] = {"type": "paragraph"}
    if text:
        paragraph["content"] = [{"type": "text", "text": text}]
    return {"type": "doc", "content": [paragraph]}


def _article_columns(table: str, *, has_published_at: bool = False) -> None:
    op.add_column(table, sa.Column("slug", sa.Text(), nullable=True))
    op.add_column(table, sa.Column("excerpt", sa.Text(), nullable=True))
    op.add_column(table, sa.Column("body_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column(table, sa.Column("publication_status", sa.Text(), nullable=True))
    if not has_published_at:
        op.add_column(table, sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(table, sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))


def _image_table(name: str, parent: str) -> None:
    op.create_table(
        name,
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column(f"{parent}_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("alt_text", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_cover", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint([f"{parent}_id"], [f"{parent}.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_path"),
        sa.UniqueConstraint(f"{parent}_id", "sort_order"),
    )
    op.execute(
        f"CREATE UNIQUE INDEX uq_{name}_cover ON {name} ({parent}_id) WHERE is_cover"
    )


def _backfill_announcements() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, title, body, published_at, deactivated_at FROM announcement")
    ).mappings()
    used: set[str] = set()
    statement = sa.text(
        "UPDATE announcement SET slug=:slug, excerpt=:excerpt, body_json=:body_json, "
        "publication_status=:publication_status, archived_at=:archived_at WHERE id=:id"
    ).bindparams(sa.bindparam("body_json", type_=postgresql.JSONB))
    for row in rows:
        status = "archived" if row["deactivated_at"] else "published" if row["published_at"] else "draft"
        bind.execute(
            statement,
            {
                "id": row["id"],
                "slug": _slug(row["title"], used),
                "excerpt": (row["body"] or "").strip(),
                "body_json": _document(row["body"]),
                "publication_status": status,
                "archived_at": row["deactivated_at"] if status == "archived" else None,
            },
        )


def _backfill_activities() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, title, description, is_published, created_at FROM activity")
    ).mappings()
    used: set[str] = set()
    statement = sa.text(
        "UPDATE activity SET slug=:slug, excerpt=:excerpt, body_json=:body_json, "
        "publication_status=:publication_status, published_at=:published_at WHERE id=:id"
    ).bindparams(sa.bindparam("body_json", type_=postgresql.JSONB))
    for row in rows:
        status = "published" if row["is_published"] else "draft"
        bind.execute(
            statement,
            {
                "id": row["id"],
                "slug": _slug(row["title"], used),
                "excerpt": (row["description"] or "").strip(),
                "body_json": _document(row["description"]),
                "publication_status": status,
                "published_at": row["created_at"] if status == "published" else None,
            },
        )


def _backfill_drives() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, title, description, status, opened_at, closed_at FROM donation_drive")
    ).mappings()
    used: set[str] = set()
    statement = sa.text(
        "UPDATE donation_drive SET slug=:slug, excerpt=:excerpt, body_json=:body_json, "
        "publication_status=:publication_status, published_at=:published_at, archived_at=:archived_at, "
        "active_from=:active_from, active_until=:active_until WHERE id=:id"
    ).bindparams(sa.bindparam("body_json", type_=postgresql.JSONB))
    for row in rows:
        status = "archived" if row["status"] == "closed" else "published"
        bind.execute(
            statement,
            {
                "id": row["id"],
                "slug": _slug(row["title"], used),
                "excerpt": (row["description"] or "").strip(),
                "body_json": _document(row["description"]),
                "publication_status": status,
                "published_at": row["opened_at"],
                "archived_at": row["closed_at"] if status == "archived" else None,
                "active_from": row["opened_at"],
                "active_until": row["closed_at"],
            },
        )


def _finalize_article_columns(table: str) -> None:
    op.alter_column(table, "slug", nullable=False)
    op.alter_column(table, "excerpt", nullable=False)
    op.alter_column(table, "body_json", nullable=False)
    op.alter_column(table, "publication_status", nullable=False, server_default=sa.text("'draft'"))
    op.create_unique_constraint(f"uq_{table}_slug", table, ["slug"])
    op.create_check_constraint(
        f"ck_{table}_publication_status_valid",
        table,
        "publication_status IN ('draft', 'published', 'archived')",
    )


def upgrade() -> None:
    _article_columns("announcement", has_published_at=True)
    _article_columns("activity")
    _article_columns("donation_drive")
    op.add_column("donation_drive", sa.Column("organizer_name", sa.Text(), nullable=True))
    op.add_column("donation_drive", sa.Column("organizer_contact", sa.Text(), nullable=True))
    op.add_column("donation_drive", sa.Column("drop_off_instructions", sa.Text(), nullable=True))
    op.add_column("donation_drive", sa.Column("active_from", sa.DateTime(timezone=True), nullable=True))
    op.add_column("donation_drive", sa.Column("active_until", sa.DateTime(timezone=True), nullable=True))

    _image_table("announcement_image", "announcement")
    _image_table("activity_image", "activity")
    _image_table("donation_drive_image", "donation_drive")
    _backfill_announcements()
    _backfill_activities()
    _backfill_drives()
    for table in ("announcement", "activity", "donation_drive"):
        _finalize_article_columns(table)

    op.drop_column("announcement", "body")
    op.drop_column("activity", "description")
    op.drop_column("activity", "is_published")
    op.drop_constraint("ck_donation_drive_donation_drive_status_valid", "donation_drive", type_="check")
    op.drop_column("donation_drive", "description")
    op.drop_column("donation_drive", "status")
    op.drop_column("donation_drive", "opened_at")
    op.drop_column("donation_drive", "closed_at")
    op.drop_table("donation")
    op.drop_table("drive_need")
    op.execute("DROP TABLE IF EXISTS assistance_record")


def downgrade() -> None:
    # Schema rollback is supported for CI and local experimentation. Retired donor
    # transactions cannot be reconstructed from informational articles, so the
    # recreated legacy tables are intentionally empty.
    op.drop_table("donation_drive_image")
    op.drop_table("activity_image")
    op.drop_table("announcement_image")

    op.add_column(
        "announcement", sa.Column("body", sa.Text(), server_default=sa.text("''"), nullable=False)
    )
    op.add_column("activity", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "activity", sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False)
    )
    op.add_column("donation_drive", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "donation_drive", sa.Column("status", sa.Text(), server_default=sa.text("'open'"), nullable=False)
    )
    op.add_column(
        "donation_drive", sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False)
    )
    op.add_column("donation_drive", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "ck_donation_drive_donation_drive_status_valid",
        "donation_drive",
        "status IN ('open', 'closed')",
    )
    op.create_table(
        "drive_need",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("drive_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_name", sa.Text(), nullable=False),
        sa.Column("target_quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["drive_id"], ["donation_drive.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "donation",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("drive_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("drive_need_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reference_no", sa.Text(), nullable=False),
        sa.Column("donor_name", sa.Text(), nullable=False),
        sa.Column("donor_contact", sa.Text(), nullable=True),
        sa.Column("item_name", sa.Text(), nullable=False),
        sa.Column("quantity_pledged", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity_received", sa.Numeric(10, 2), nullable=True),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'submitted'"), nullable=False),
        sa.Column("is_walk_in", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status_changed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["drive_id"], ["donation_drive.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["drive_need_id"], ["drive_need.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_no"),
    )
    op.create_index("idx_donation_drive_status", "donation", ["drive_id", "status"])

    for table in ("announcement", "activity", "donation_drive"):
        op.drop_constraint(f"ck_{table}_publication_status_valid", table, type_="check")
        op.drop_constraint(f"uq_{table}_slug", table, type_="unique")
        op.drop_column(table, "archived_at")
        if table != "announcement":
            op.drop_column(table, "published_at")
        op.drop_column(table, "publication_status")
        op.drop_column(table, "body_json")
        op.drop_column(table, "excerpt")
        op.drop_column(table, "slug")
    for column in ("active_until", "active_from", "drop_off_instructions", "organizer_contact", "organizer_name"):
        op.drop_column("donation_drive", column)
