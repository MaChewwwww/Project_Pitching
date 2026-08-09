"""SQLAlchemy ORM models for the safety module (FR-SAF-*).

Columns come from docs/schema.md. Do not invent them; a missing column that a
requirement needs is a doc gap to flag, not something to freelance around —
`created_at`/`updated_at` on `UnregisteredPerson` and `RescueRequest` are
exactly that kind of flagged gap (schema.md referenced `rescue_request.
created_at` in its own index without ever listing the column).

Register this module in `src/db/models_registry.py`, or Alembic autogenerate
will emit a migration that drops these tables.

`EmergencyEvent`, which every table here is scoped to, lives in
`evacuation/models.py` — it existed before this module and evacuation already
owns its lifecycle (FR-SAF-018/019). This module only holds an FK to it.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, text
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

SAFETY_STATUSES = ("safe", "needs_rescue", "unaccounted")
SET_METHODS = ("self", "assisted", "household_bulk")
RESCUE_STATUSES = ("pending", "verified", "dispatched", "resolved", "dismissed")
INCIDENT_TYPES = (
    "flooding",
    "fire",
    "fallen_tree",
    "road_blockage",
    "landslide",
    "power_outage",
    "other",
)
INCIDENT_STATUSES = ("pending", "verified", "dismissed")


class UnregisteredPerson(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """FR-SAF-012/013 — recorded with a name and a location, nothing else.

    schema.md does not list `created_at`/`updated_at` for this table, but
    "when was this recorded" is otherwise unrecoverable, so `TimestampMixin`
    is added here — a flagged doc gap, not a freelanced column.
    """

    __tablename__ = "unregistered_person"

    event_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="CASCADE"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )
    location_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    # FR-SAF-014 (convert to a full registration) is cut from this pass — this
    # column is kept because the table shape without it would need a migration
    # to add later, and it costs nothing to leave nullable and unused.
    converted_household_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("household.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        Index("idx_unregistered_event", "event_id"),
        Index("idx_unregistered_location", "location", postgresql_using="gist"),
    )


class SafetyStatus(UUIDPrimaryKeyMixin, Base):
    """FR-SAF-001…007. Append-only — own `set_at`, no `TimestampMixin`, the
    same shape `HouseholdMerge` uses. A correction never `UPDATE`s `status`;
    it inserts a new row and sets `superseded_at` on the old one.

    No `household_id` column: a household bulk action fans out to one row per
    member, which is what makes `set_method` able to carry FR-SAF-005's
    confidence distinction (individually confirmed vs. swept in by a bulk
    action) after the fact.
    """

    __tablename__ = "safety_status"

    event_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("member.id", ondelete="CASCADE"), nullable=True
    )
    unregistered_person_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("unregistered_person.id", ondelete="CASCADE"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    # Always the acting user, even for "self" — see service.py's note on the
    # schema.md wording ("null if self-set by the head") this deliberately
    # does not follow: FR-SAF-007 requires recording *who*, and `set_method`
    # already carries the self/assisted/bulk distinction.
    set_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    set_method: Mapped[str] = mapped_column(Text, nullable=False)
    set_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    superseded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(f"status IN {SAFETY_STATUSES}", name="safety_status_status_valid"),
        CheckConstraint(f"set_method IN {SET_METHODS}", name="safety_status_set_method_valid"),
        CheckConstraint(
            "num_nonnulls(member_id, unregistered_person_id) = 1",
            name="chk_subject_exactly_one",
        ),
        Index(
            "idx_safety_event_current",
            "event_id",
            "status",
            postgresql_where=text("superseded_at IS NULL"),
        ),
        # The two indexes below are what actually enforce "at most one current
        # row per subject" — schema.md described the rule in prose only.
        # Without them, two concurrent "safe" writes for one member both
        # succeed and the accounted-for dashboard double-counts.
        Index(
            "uq_safety_current_member",
            "event_id",
            "member_id",
            unique=True,
            postgresql_where=text("superseded_at IS NULL AND member_id IS NOT NULL"),
        ),
        Index(
            "uq_safety_current_unreg",
            "event_id",
            "unregistered_person_id",
            unique=True,
            postgresql_where=text(
                "superseded_at IS NULL AND unregistered_person_id IS NOT NULL"
            ),
        ),
    )


class RescueRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """FR-SAF-008…010, 017. `event_id` and `household_id` are both nullable,
    deliberately: an anonymous request (FR-SAF-009) is written with no
    database read at all, so neither can be resolved on the request path.

    schema.md's column list did not include `created_at`, despite its own
    `idx_rescue_open` index referencing it — a flagged doc gap, fixed here by
    using `TimestampMixin` rather than a bare `created_at`, since the queue
    also needs `updated_at` once triage starts mutating rows.
    """

    __tablename__ = "rescue_request"

    event_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="SET NULL"), nullable=True
    )
    household_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("household.id", ondelete="SET NULL"), nullable=True
    )
    requester_name: Mapped[str] = mapped_column(Text, nullable=False)
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )
    location_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    people_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    # NULL until `list_rescue_requests` triages it (computed lazily on first
    # read — see service.py). Never set on insert; S2's public endpoint does
    # no DB read, so it cannot look up anything to derive a priority from.
    priority: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # A snapshot of a vulnerability *level* that BRD OI-18 has not defined yet
    # (domain/vulnerability.py has no scoring function). Left NULL rather than
    # populated from the raw per-member flags used for triage, so this column
    # means exactly what its name says once OI-18 lands, not something else
    # wearing its name in the meantime.
    vulnerability_level: Mapped[str | None] = mapped_column(Text, nullable=True)
    # `0009_rescue_priority_manual` — set when an officer overrides `priority`
    # via PATCH, so a later lazy-triage pass never silently recomputes over
    # a deliberate human decision.
    priority_is_manual: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    assigned_to_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Abuse investigation only (schema.md) — never serialised in a response
    # DTO. See safety/schemas.py.
    source_ip: Mapped[str | None] = mapped_column(INET, nullable=True)

    __table_args__ = (
        CheckConstraint(f"status IN {RESCUE_STATUSES}", name="rescue_request_status_valid"),
        Index(
            "idx_rescue_open",
            "status",
            "priority",
            "created_at",
            postgresql_where=text("status IN ('pending', 'verified', 'dispatched')"),
        ),
        Index("idx_rescue_location", "location", postgresql_using="gist"),
    )


class IncidentReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """FR-SAF-015/016. `event_id` is nullable — a report may precede a
    declared event, same reasoning as `RescueRequest.event_id`.

    `created_at`/`updated_at` and `dismissal_reason` are not in schema.md's
    original column list, despite FR-SAF-016 requiring reports be "marked
    verified or dismissed **with reason**" — flagged doc gaps, fixed in
    migration `0010_incident_report` alongside the CHECK that makes "with
    reason" a database guarantee rather than aspirational text.
    """

    __tablename__ = "incident_report"

    event_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("emergency_event.id", ondelete="SET NULL"), nullable=True
    )
    reported_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )
    location_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Relative to settings.upload_dir — never the client's filename. See
    # core/uploads.py. NULL means no photo was attached.
    photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    verified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissal_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(f"type IN {INCIDENT_TYPES}", name="ck_incident_report_type_valid"),
        CheckConstraint(f"status IN {INCIDENT_STATUSES}", name="ck_incident_report_status_valid"),
        CheckConstraint(
            "status <> 'dismissed' OR dismissal_reason IS NOT NULL",
            name="ck_incident_report_dismissal_needs_reason",
        ),
        Index("idx_incident_status", "status", "created_at"),
        Index("idx_incident_location", "location", postgresql_using="gist"),
    )
