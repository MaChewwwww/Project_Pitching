"""Barangay areas — the spatial anchor of the whole system.

Covers FR-SYS-013 (schema.md Section 4). Everything spatial is EPSG:4326: the NOAH
shapefiles arrive in WGS84, Leaflet expects WGS84, and GeoJSON defaults to WGS84,
so no reprojection exists anywhere in this system.

The boundary polygons themselves are still blocked on BRD OI-3 — the table exists,
the rows do not.
"""

from __future__ import annotations

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

FLOOD_EXPOSURE_LEVELS = ("low", "medium", "high")


class Area(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A barangay zone. Boundaries are approximations for planning (BR-2.8)."""

    __tablename__ = "area"

    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)  # "Area 1"
    code: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)

    # Nullable pending BRD OI-3 — the barangay has not supplied boundary polygons
    # yet, and area rows (the FK target for household/facility/activity) must be
    # seedable before that arrives. Null means "boundary not yet supplied", never
    # "no such area" (schema.md Section 4).
    geom: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False),
        nullable=True,
    )
    # Generated on write; used for map labels rather than recomputing per render.
    centroid: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True,
    )

    # Precomputed from hazard overlap so the map does not run a spatial join per tile.
    flood_exposure: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # 'official' = supplied by the barangay (BRD OI-3); 'approximate' = generated
    # by tools/gen_area_seed.py from the clip extent (FR-MAP-001/008).
    # NULL means no boundary has been stored yet.
    boundary_source: Mapped[str | None] = mapped_column(String(20), nullable=True)

    __table_args__ = (
        CheckConstraint(
            f"flood_exposure IS NULL OR flood_exposure IN {FLOOD_EXPOSURE_LEVELS}",
            name="area_flood_exposure_valid",
        ),
        CheckConstraint(
            "boundary_source IS NULL OR boundary_source IN ('official', 'approximate')",
            name="ck_area_boundary_source_valid",
        ),
        # GiST, named as schema.md Section 4 specifies. GeoAlchemy2 would create its
        # own index under a generated name; spatial_index=False above disables that.
        Index("idx_area_geom", "geom", postgresql_using="gist"),
    )


FACILITY_TYPES = (
    "evacuation_center",
    "hospital",
    "clinic",
    "barangay_hall",
    "police",
    "fire",
    "rescue_station",
)


class Facility(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Barangay facility registry (FR-SYS-015, FR-MAP-005, FR-MAP-006)."""

    __tablename__ = "facility"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[object] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    area_id: Mapped[object | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("area.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    __table_args__ = (
        CheckConstraint(f"type IN {FACILITY_TYPES}", name="facility_type_valid"),
        Index("idx_facility_location", "location", postgresql_using="gist"),
        Index(
            "idx_facility_type",
            "type",
            postgresql_where=text("is_active"),
        ),
    )


HOTLINE_TYPES = ("barangay", "police", "fire", "ambulance", "hospital", "rescue", "mdrrmo")


class Hotline(UUIDPrimaryKeyMixin, Base):
    """Emergency hotline directory (FR-SYS-014, FR-PUB-007, FR-PUB-015)."""

    __tablename__ = "hotline"

    label: Mapped[str] = mapped_column(Text, nullable=False)
    number: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    __table_args__ = (CheckConstraint(f"type IN {HOTLINE_TYPES}", name="hotline_type_valid"),)


SIREN_STATUSES = ("idle", "sounding")


class Siren(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Manual-trigger siren unit (FR-MAP-014).

    The map shows siren pins to help residents understand which units would
    sound in an emergency. Status is toggled by an officer — there is no
    automatic trigger and no physical hardware interface. The 'sounding'
    status is a *simulation* for demo purposes, exactly as described in
    SAF_MAP_IMPLEMENTATION.md M4.

    Placed in geo/models.py (not a separate module) because it is co-located
    spatial data — same spatial queries, same router/service structure, no
    cross-module business logic.
    """

    __tablename__ = "siren"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[object] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default=text("'idle'")
    )
    area_id: Mapped[object | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("area.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(f"status IN {SIREN_STATUSES}", name="ck_siren_status_valid"),
        Index("idx_siren_location", "location", postgresql_using="gist"),
    )

