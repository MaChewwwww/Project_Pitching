"""Barangay areas — the spatial anchor of the whole system.

Covers FR-SYS-013 (schema.md Section 4). Everything spatial is EPSG:4326: the NOAH
shapefiles arrive in WGS84, Leaflet expects WGS84, and GeoJSON defaults to WGS84,
so no reprojection exists anywhere in this system.

The boundary polygons themselves are still blocked on BRD OI-3 — the table exists,
the rows do not.
"""

from __future__ import annotations

from geoalchemy2 import Geometry
from sqlalchemy import CheckConstraint, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

FLOOD_EXPOSURE_LEVELS = ("low", "medium", "high")


class Area(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A barangay zone. Boundaries are approximations for planning (BR-2.8)."""

    __tablename__ = "area"

    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)  # "Area 1"
    code: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)

    geom: Mapped[object] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False),
        nullable=False,
    )
    # Generated on write; used for map labels rather than recomputing per render.
    centroid: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True,
    )

    # Precomputed from hazard overlap so the map does not run a spatial join per tile.
    flood_exposure: Mapped[str | None] = mapped_column(String(10), nullable=True)

    __table_args__ = (
        CheckConstraint(
            f"flood_exposure IS NULL OR flood_exposure IN {FLOOD_EXPOSURE_LEVELS}",
            name="area_flood_exposure_valid",
        ),
        # GiST, named as schema.md Section 4 specifies. GeoAlchemy2 would create its
        # own index under a generated name; spatial_index=False above disables that.
        Index("idx_area_geom", "geom", postgresql_using="gist"),
    )
