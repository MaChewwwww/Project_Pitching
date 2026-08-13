"""Pydantic request/response models for the geo module (FR-SYS-013, FR-SYS-015, FR-MAP-*).

These define the API contract. Changing one changes `packages/api-types` —
run `make types` and commit the diff in the same PR (architecture.md 12.4).
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

FACILITY_TYPES = (
    "evacuation_center",
    "hospital",
    "clinic",
    "barangay_hall",
    "police",
    "fire",
    "rescue_station",
)
HOTLINE_TYPES = ("barangay", "police", "fire", "ambulance", "hospital", "rescue", "mdrrmo")


class GeoJsonPoint(BaseModel):
    type: str = "Point"
    coordinates: tuple[float, float]  # [longitude, latitude]


# --- public -----------------------------------------------------------------


class PublicHotline(BaseModel):
    id: uuid.UUID
    label: str
    number: str
    type: str
    sort_order: int


class PublicFacility(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    address: str | None
    contact_number: str | None
    location: GeoJsonPoint
    area_id: uuid.UUID | None
    area_name: str | None


class PublicArea(BaseModel):
    id: uuid.UUID
    name: str
    code: str | None
    flood_exposure: str | None
    has_boundary: bool  # derived — geom IS NOT NULL, pending BRD OI-3


class PointResolution(BaseModel):
    """Boundary-derived location context; exact addresses are entered by users."""

    latitude: float
    longitude: float
    within_barangay: bool
    area_id: uuid.UUID | None = None
    area_name: str | None = None
    # Kept for response compatibility; no street-level address is inferred.
    address_label: str | None = None


# --- admin --------------------------------------------------------------------


class HotlineIn(BaseModel):
    label: str
    number: str
    type: str
    sort_order: int = 0
    is_active: bool = True


class HotlineOut(PublicHotline):
    is_active: bool


class FacilityIn(BaseModel):
    name: str
    type: str
    address: str | None = None
    contact_number: str | None = None
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)
    area_id: uuid.UUID | None = None
    is_active: bool = True


class FacilityOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    address: str | None
    contact_number: str | None
    location: GeoJsonPoint
    area_id: uuid.UUID | None
    is_active: bool


class AreaPatch(BaseModel):
    name: str | None = None
    code: str | None = None
    flood_exposure: str | None = None


class AreaOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str | None
    flood_exposure: str | None
    has_boundary: bool
    boundary_source: str | None


# --- area boundary GeoJSON (FR-MAP-001) ---------------------------------------


class AreaBoundaryProperties(BaseModel):
    """Non-spatial properties attached to each area boundary feature."""

    area_id: uuid.UUID
    name: str
    code: str | None
    flood_exposure: str | None
    boundary_source: str | None


class AreaBoundaryFeature(BaseModel):
    type: str = "Feature"
    properties: AreaBoundaryProperties
    geometry: object  # raw GeoJSON geometry dict — passed through from ST_AsGeoJSON


class AreaBoundaryCollection(BaseModel):
    """GeoJSON FeatureCollection of area boundary polygons.

    A 404/empty geometry is not an error — the map degrades gracefully if
    boundaries have not been loaded yet (same principle as the hazard layer).
    """

    type: str = "FeatureCollection"
    features: list[AreaBoundaryFeature]


# --- sirens (FR-MAP-014) ------------------------------------------------------


class PublicSiren(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    location: GeoJsonPoint
    area_id: uuid.UUID | None


class SirenIn(BaseModel):
    name: str
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)
    area_id: uuid.UUID | None = None
    status: str = "idle"


class SirenOut(PublicSiren):
    pass
