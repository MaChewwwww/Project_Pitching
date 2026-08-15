"""Business logic and transaction boundaries for the geo module (FR-SYS-013, FR-SYS-015, FR-MAP-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import ConflictError, NotFoundError, ValidationError
from src.modules.geo.models import Area, Facility, Hotline, Siren
from src.modules.geo.schemas import (
    AdminFacilityOut,
    AreaBoundaryCollection,
    AreaBoundaryFeature,
    AreaBoundaryProperties,
    AreaOut,
    AreaPatch,
    FacilityIn,
    FacilityOut,
    GeoJsonPoint,
    HotlineIn,
    PointResolution,
    PublicArea,
    PublicFacility,
    PublicSiren,
    SirenAuditOut,
    SirenDrillResult,
    SirenIn,
    SirenOut,
)
from src.modules.users.models import AuditLog


def point_to_geojson(location) -> GeoJsonPoint | None:
    """A GeoAlchemy2 `WKBElement` (or the raw GeoJSON string via ST_AsGeoJSON) → DTO."""
    if location is None:
        return None
    if isinstance(location, str):
        data = json.loads(location)
        return GeoJsonPoint(coordinates=tuple(data["coordinates"]))
    try:
        from geoalchemy2.shape import to_shape

        shape = to_shape(location)
        return GeoJsonPoint(coordinates=(shape.x, shape.y))
    except (ImportError, Exception):
        raw = getattr(location, "data", location)
        if isinstance(raw, str):
            raw = bytes.fromhex(raw)
        if isinstance(raw, (bytes, bytearray)) and len(raw) >= 21:
            import struct

            bo = "<" if raw[0] == 1 else ">"
            gt = struct.unpack(f"{bo}I", raw[1:5])[0]
            off = 5 + (4 if (gt & 0x20000000) else 0)
            x, y = struct.unpack(f"{bo}dd", raw[off : off + 16])
            return GeoJsonPoint(coordinates=(x, y))
        raise


# --- hotlines (FR-SYS-014) ----------------------------------------------------


async def list_hotlines(session: AsyncSession, *, active_only: bool = True) -> list[Hotline]:
    stmt = select(Hotline).order_by(Hotline.sort_order)
    if active_only:
        stmt = stmt.where(Hotline.is_active.is_(True))
    return list((await session.execute(stmt)).scalars().all())


async def create_hotline(session: AsyncSession, data: HotlineIn, *, actor_id: uuid.UUID) -> Hotline:
    hotline = Hotline(**data.model_dump())
    session.add(hotline)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="hotline.create",
        entity_type="hotline",
        entity_id=hotline.id,
    )
    await session.commit()
    return hotline


async def update_hotline(
    session: AsyncSession, hotline_id: uuid.UUID, data: HotlineIn, *, actor_id: uuid.UUID
) -> Hotline:
    hotline = await session.get(Hotline, hotline_id)
    if hotline is None:
        raise NotFoundError("Hotline not found.")
    for key, value in data.model_dump().items():
        setattr(hotline, key, value)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="hotline.update",
        entity_type="hotline",
        entity_id=hotline.id,
    )
    await session.commit()
    return hotline


async def delete_hotline(
    session: AsyncSession, hotline_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    hotline = await session.get(Hotline, hotline_id)
    if hotline is None:
        raise NotFoundError("Hotline not found.")
    await session.delete(hotline)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="hotline.delete",
        entity_type="hotline",
        entity_id=hotline_id,
    )
    await session.commit()


# --- facilities (FR-SYS-015, FR-MAP-005/006) ----------------------------------


async def list_facilities(
    session: AsyncSession, *, type_filter: str | None = None, active_only: bool = True
) -> list[PublicFacility]:
    stmt = select(Facility, Area.name, func.ST_AsGeoJSON(Facility.location)).outerjoin(
        Area, Facility.area_id == Area.id
    )
    if type_filter:
        stmt = stmt.where(Facility.type == type_filter)
    if active_only:
        stmt = stmt.where(Facility.is_active.is_(True))
    rows = (await session.execute(stmt.order_by(Facility.name))).all()
    return [
        PublicFacility(
            id=f.id,
            name=f.name,
            type=f.type,
            address=f.address,
            contact_number=f.contact_number,
            location=point_to_geojson(geojson),
            area_id=f.area_id,
            area_name=area_name,
        )
        for f, area_name, geojson in rows
    ]


async def list_admin_facilities(session: AsyncSession) -> list[AdminFacilityOut]:
    rows = await session.execute(
        select(Facility, Area.name, func.ST_AsGeoJSON(Facility.location))
        .outerjoin(Area, Facility.area_id == Area.id)
        .order_by(Facility.name)
    )
    return [
        AdminFacilityOut(
            id=facility.id,
            name=facility.name,
            type=facility.type,
            address=facility.address,
            contact_number=facility.contact_number,
            location=point_to_geojson(geojson),
            area_id=facility.area_id,
            area_name=area_name,
            is_active=facility.is_active,
        )
        for facility, area_name, geojson in rows.all()
    ]


async def get_facility_or_404(session: AsyncSession, facility_id: uuid.UUID) -> Facility:
    facility = await session.get(Facility, facility_id)
    if facility is None:
        raise NotFoundError("Facility not found.")
    return facility


async def area_for_point(session: AsyncSession, lat: float, lon: float) -> Area | None:
    """Return the area whose boundary polygon contains (lon, lat), or None.

    PostGIS query #1 — finally live once 0011_area_boundaries populates geom.
    Returns None gracefully if no polygon covers the point (e.g. before the
    migration runs, or for a point outside every area boundary).
    """
    result = await session.execute(
        select(Area).where(
            func.ST_Covers(
                Area.geom,
                func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
            )
        )
    )
    return result.scalars().first()


async def resolve_point(
    session: AsyncSession, *, latitude: float, longitude: float
) -> PointResolution:
    """Resolve a pin against the seeded barangay boundaries.

    This endpoint only confirms the barangay/area boundary. It does not infer
    a street-level address: the map has no authoritative house-number dataset,
    and the request path must not call an external reverse-geocoding provider.
    Callers should leave the address field for the user to enter.
    """
    area = await area_for_point(session, latitude, longitude)
    if area is None:
        return PointResolution(
            latitude=latitude,
            longitude=longitude,
            within_barangay=False,
        )
    return PointResolution(
        latitude=latitude,
        longitude=longitude,
        within_barangay=True,
        area_id=area.id,
        area_name=area.name,
    )


async def _require_barangay_area(
    session: AsyncSession, *, latitude: float, longitude: float
) -> uuid.UUID:
    """Pins are operational data: they must resolve to a San Jose area."""
    area = await area_for_point(session, latitude, longitude)
    if area is None:
        raise ValidationError("Choose a location inside Barangay San Jose.")
    return area.id


async def list_area_boundaries(session: AsyncSession) -> AreaBoundaryCollection:
    """Return all areas that have a boundary polygon as a GeoJSON FeatureCollection.

    Separate from `list_areas` — that endpoint returns names/stats with no
    geometry. The map needs the actual polygons; non-map callers don't.
    An empty list is valid: the map degrades gracefully, same as the hazard
    layer (FR-PUB-016, NFR-AVL-002).
    """
    rows = await session.execute(
        select(
            Area,
            func.ST_AsGeoJSON(Area.geom).label("geojson"),
        ).where(Area.geom.is_not(None))
    )
    features: list[AreaBoundaryFeature] = []
    for area, geojson_str in rows.all():
        if geojson_str is None:
            continue
        features.append(
            AreaBoundaryFeature(
                properties=AreaBoundaryProperties(
                    area_id=area.id,
                    name=area.name,
                    code=area.code,
                    flood_exposure=area.flood_exposure,
                    boundary_source=area.boundary_source,
                ),
                geometry=json.loads(geojson_str),
            )
        )
    return AreaBoundaryCollection(features=features)


async def create_facility(
    session: AsyncSession, data: FacilityIn, *, actor_id: uuid.UUID
) -> Facility:
    area_id = await _require_barangay_area(
        session, latitude=data.latitude, longitude=data.longitude
    )

    facility = Facility(
        name=data.name,
        type=data.type,
        address=data.address,
        contact_number=data.contact_number,
        area_id=area_id,
        is_active=data.is_active,
        location=func.ST_SetSRID(func.ST_MakePoint(data.longitude, data.latitude), 4326),
    )
    session.add(facility)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.create",
        entity_type="facility",
        entity_id=facility.id,
    )
    await session.commit()
    await session.refresh(facility)
    return facility


async def update_facility(
    session: AsyncSession, facility_id: uuid.UUID, data: FacilityIn, *, actor_id: uuid.UUID
) -> Facility:
    facility = await session.get(Facility, facility_id)
    if facility is None:
        raise NotFoundError("Facility not found.")
    area_id = await _require_barangay_area(
        session, latitude=data.latitude, longitude=data.longitude
    )

    facility.name = data.name
    facility.type = data.type
    facility.address = data.address
    facility.contact_number = data.contact_number
    facility.area_id = area_id
    facility.is_active = data.is_active
    facility.location = func.ST_SetSRID(func.ST_MakePoint(data.longitude, data.latitude), 4326)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.update",
        entity_type="facility",
        entity_id=facility.id,
    )
    await session.commit()
    await session.refresh(facility)
    return facility


async def delete_facility(
    session: AsyncSession, facility_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    facility = await session.get(Facility, facility_id)
    if facility is None:
        raise NotFoundError("Facility not found.")
    facility.is_active = False
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.deactivate",
        entity_type="facility",
        entity_id=facility_id,
    )
    await session.commit()


async def reactivate_facility(
    session: AsyncSession, facility_id: uuid.UUID, *, actor_id: uuid.UUID
) -> Facility:
    facility = await session.get(Facility, facility_id)
    if facility is None:
        raise NotFoundError("Facility not found.")
    facility.is_active = True
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.reactivate",
        entity_type="facility",
        entity_id=facility.id,
    )
    await session.commit()
    return facility


async def facility_out(session: AsyncSession, facility: Facility) -> FacilityOut:
    geojson = (
        await session.execute(
            select(func.ST_AsGeoJSON(Facility.location)).where(Facility.id == facility.id)
        )
    ).scalar_one()
    area_name = await session.scalar(select(Area.name).where(Area.id == facility.area_id))
    return FacilityOut(
        id=facility.id,
        name=facility.name,
        type=facility.type,
        address=facility.address,
        contact_number=facility.contact_number,
        location=point_to_geojson(geojson),
        area_id=facility.area_id,
        area_name=area_name,
        is_active=facility.is_active,
    )


# --- areas (FR-SYS-013) -------------------------------------------------------


async def list_areas(session: AsyncSession) -> list[Area]:
    return list((await session.execute(select(Area).order_by(Area.name))).scalars().all())


async def get_area_or_404(session: AsyncSession, area_id: uuid.UUID) -> Area:
    """For other modules (e.g. registry) that need to validate an `area_id` they
    were handed — a service function, not `geo.models`, per AGENTS.md Section 5."""
    area = await session.get(Area, area_id)
    if area is None:
        raise NotFoundError("No such area.")
    return area


def area_to_public(area: Area) -> PublicArea:
    return PublicArea(
        id=area.id,
        name=area.name,
        code=area.code,
        flood_exposure=area.flood_exposure,
        has_boundary=area.geom is not None,
    )


def area_to_out(area: Area) -> AreaOut:
    return AreaOut(
        id=area.id,
        name=area.name,
        code=area.code,
        flood_exposure=area.flood_exposure,
        has_boundary=area.geom is not None,
        boundary_source=area.boundary_source,
    )


async def update_area(
    session: AsyncSession, area_id: uuid.UUID, data: AreaPatch, *, actor_id: uuid.UUID
) -> Area:
    area = await session.get(Area, area_id)
    if area is None:
        raise NotFoundError("Area not found.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(area, key, value)
    await write_audit(
        session, actor_user_id=actor_id, action="area.update", entity_type="area", entity_id=area.id
    )
    await session.commit()
    return area


# --- sirens (FR-MAP-014) ------------------------------------------------------


async def list_sirens(
    session: AsyncSession, *, active_only: bool = False
) -> list[tuple[Siren, tuple[float, float], str | None]]:
    rows = await session.execute(
        select(
            Siren,
            func.ST_X(Siren.location).label("lon"),
            func.ST_Y(Siren.location).label("lat"),
            Area.name,
        )
        .outerjoin(Area, Siren.area_id == Area.id)
        .order_by(Siren.name)
    )
    if active_only:
        rows = await session.execute(
            select(
                Siren,
                func.ST_X(Siren.location).label("lon"),
                func.ST_Y(Siren.location).label("lat"),
                Area.name,
            )
            .outerjoin(Area, Siren.area_id == Area.id)
            .where(Siren.is_active.is_(True))
            .order_by(Siren.name)
        )
    return [(siren, (lon, lat), area_name) for siren, lon, lat, area_name in rows.all()]


async def get_siren_or_404(session: AsyncSession, siren_id: uuid.UUID) -> Siren:
    siren = await session.get(Siren, siren_id)
    if siren is None:
        raise NotFoundError("Siren not found.")
    return siren


async def siren_coordinates(session: AsyncSession, siren_id: uuid.UUID) -> tuple[float, float]:
    row = await session.execute(
        select(func.ST_X(Siren.location), func.ST_Y(Siren.location)).where(Siren.id == siren_id)
    )
    return row.one()


async def siren_area_name(session: AsyncSession, area_id: object | None) -> str | None:
    if area_id is None:
        return None
    return await session.scalar(select(Area.name).where(Area.id == area_id))


async def create_siren(
    session: AsyncSession, data: SirenIn, *, actor_id: uuid.UUID
) -> tuple[Siren, tuple[float, float]]:
    area_id = await _require_barangay_area(
        session, latitude=data.latitude, longitude=data.longitude
    )

    siren = Siren(
        name=data.name,
        status="idle",
        area_id=area_id,
        location=func.ST_SetSRID(func.ST_MakePoint(data.longitude, data.latitude), 4326),
    )
    session.add(siren)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="siren.create",
        entity_type="siren",
        entity_id=siren.id,
    )
    await session.commit()
    await session.refresh(siren)
    return siren, (data.longitude, data.latitude)


async def update_siren(
    session: AsyncSession, siren_id: uuid.UUID, data: SirenIn, *, actor_id: uuid.UUID
) -> tuple[Siren, tuple[float, float]]:
    siren = await session.get(Siren, siren_id)
    if siren is None:
        raise NotFoundError("Siren not found.")
    area_id = await _require_barangay_area(
        session, latitude=data.latitude, longitude=data.longitude
    )

    siren.name = data.name
    siren.area_id = area_id
    siren.location = func.ST_SetSRID(func.ST_MakePoint(data.longitude, data.latitude), 4326)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="siren.update",
        entity_type="siren",
        entity_id=siren.id,
    )
    await session.commit()
    return siren, (data.longitude, data.latitude)


async def trigger_siren(
    session: AsyncSession,
    siren_id: uuid.UUID,
    *,
    actor_id: uuid.UUID,
    is_drill: bool = False,
) -> tuple[Siren, tuple[float, float]]:
    siren = await session.get(Siren, siren_id)
    if siren is None:
        raise NotFoundError("Siren not found.")
    if not siren.is_active:
        raise ConflictError("Reactivate this siren before triggering it.")
    siren.status = "sounding"
    siren.last_triggered_at = datetime.now(UTC)
    action = "siren.drill" if is_drill else "siren.trigger"
    classification = "Drill" if is_drill else "Operational"
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=action,
        entity_type="siren",
        entity_id=siren.id,
        changes={
            "status": siren.status,
            "classification": classification,
            "name": siren.name,
        },
    )
    await session.commit()

    row = await session.execute(
        select(
            func.ST_X(Siren.location).label("lon"),
            func.ST_Y(Siren.location).label("lat"),
        ).where(Siren.id == siren.id)
    )
    lon, lat = row.one()
    return siren, (lon, lat)


async def silence_siren(
    session: AsyncSession,
    siren_id: uuid.UUID,
    *,
    actor_id: uuid.UUID,
    is_drill: bool = False,
) -> tuple[Siren, tuple[float, float]]:
    siren = await session.get(Siren, siren_id)
    if siren is None:
        raise NotFoundError("Siren not found.")
    siren.status = "idle"
    action = "siren.drill_silence" if is_drill else "siren.silence"
    classification = "Drill" if is_drill else "Operational"
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=action,
        entity_type="siren",
        entity_id=siren.id,
        changes={
            "status": siren.status,
            "classification": classification,
            "name": siren.name,
        },
    )
    await session.commit()
    row = await session.execute(
        select(func.ST_X(Siren.location), func.ST_Y(Siren.location)).where(Siren.id == siren.id)
    )
    lon, lat = row.one()
    return siren, (lon, lat)


async def trigger_all_sirens_drill(
    session: AsyncSession, *, actor_id: uuid.UUID
) -> list[tuple[Siren, tuple[float, float], str | None]]:
    """Trigger all active sirens for an administrative emergency drill simulation."""
    result = await session.execute(
        select(
            Siren,
            func.ST_X(Siren.location).label("lon"),
            func.ST_Y(Siren.location).label("lat"),
            Area.name.label("area_name"),
        )
        .outerjoin(Area, Area.id == Siren.area_id)
        .where(Siren.is_active == True)  # noqa: E712
    )
    rows = result.all()
    now = datetime.now(UTC)
    updated: list[tuple[Siren, tuple[float, float], str | None]] = []

    for siren, lon, lat, area_name in rows:
        siren.status = "sounding"
        siren.last_triggered_at = now
        await write_audit(
            session,
            actor_user_id=actor_id,
            action="siren.drill",
            entity_type="siren",
            entity_id=siren.id,
            changes={
                "status": "sounding",
                "classification": "Drill",
                "mode": "simulation",
                "name": siren.name,
                "area_name": area_name,
            },
        )
        updated.append((siren, (lon, lat), area_name))

    await session.commit()
    return updated


async def silence_all_sirens_drill(
    session: AsyncSession, *, actor_id: uuid.UUID
) -> list[tuple[Siren, tuple[float, float], str | None]]:
    """Silence all active sirens concluding the drill simulation."""
    result = await session.execute(
        select(
            Siren,
            func.ST_X(Siren.location).label("lon"),
            func.ST_Y(Siren.location).label("lat"),
            Area.name.label("area_name"),
        )
        .outerjoin(Area, Area.id == Siren.area_id)
        .where(Siren.is_active == True)  # noqa: E712
    )
    rows = result.all()
    updated: list[tuple[Siren, tuple[float, float], str | None]] = []

    for siren, lon, lat, area_name in rows:
        siren.status = "idle"
        await write_audit(
            session,
            actor_user_id=actor_id,
            action="siren.drill_silence",
            entity_type="siren",
            entity_id=siren.id,
            changes={
                "status": "idle",
                "classification": "Drill",
                "mode": "simulation",
                "name": siren.name,
                "area_name": area_name,
            },
        )
        updated.append((siren, (lon, lat), area_name))

    await session.commit()
    return updated


async def list_siren_audits(
    session: AsyncSession, siren_id: uuid.UUID | None = None
) -> list[SirenAuditOut]:
    """Query audit logs associated with siren units and drill exercises."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.entity_type == "siren")
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    if siren_id is not None:
        stmt = stmt.where(AuditLog.entity_id == siren_id)

    result = await session.execute(stmt)
    records = result.scalars().all()

    audits: list[SirenAuditOut] = []
    for log in records:
        changes_dict = log.changes if isinstance(log.changes, dict) else {}
        classification = changes_dict.get("classification") if changes_dict else None
        if not classification:
            if "drill" in log.action:
                classification = "Drill"
            elif "trigger" in log.action:
                classification = "Operational"
            else:
                classification = "Administrative"

        audits.append(
            SirenAuditOut(
                id=log.id,
                action=log.action,
                entity_id=log.entity_id,
                actor_user_id=log.actor_user_id,
                classification=str(classification),
                created_at=log.created_at,
                changes=changes_dict,
            )
        )
    return audits


async def delete_siren(session: AsyncSession, siren_id: uuid.UUID, *, actor_id: uuid.UUID) -> None:
    siren = await session.get(Siren, siren_id)
    if siren is None:
        raise NotFoundError("Siren not found.")
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="siren.delete",
        entity_type="siren",
        entity_id=siren.id,
    )
    siren.is_active = False
    siren.status = "idle"
    await session.commit()


async def reactivate_siren(
    session: AsyncSession, siren_id: uuid.UUID, *, actor_id: uuid.UUID
) -> tuple[Siren, tuple[float, float]]:
    siren = await session.get(Siren, siren_id)
    if siren is None:
        raise NotFoundError("Siren not found.")
    siren.is_active = True
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="siren.reactivate",
        entity_type="siren",
        entity_id=siren.id,
    )
    await session.commit()
    row = await session.execute(
        select(func.ST_X(Siren.location), func.ST_Y(Siren.location)).where(Siren.id == siren.id)
    )
    lon, lat = row.one()
    return siren, (lon, lat)


def siren_to_public(siren: Siren, coords: tuple[float, float]) -> PublicSiren:
    return PublicSiren(
        id=siren.id,
        name=siren.name,
        status=siren.status,
        location=GeoJsonPoint(type="Point", coordinates=coords),
        area_id=siren.area_id,
    )


def siren_to_out(
    siren: Siren, coords: tuple[float, float], area_name: str | None = None
) -> SirenOut:
    return SirenOut(
        id=siren.id,
        name=siren.name,
        status=siren.status,
        location=GeoJsonPoint(type="Point", coordinates=coords),
        area_id=siren.area_id,
        area_name=area_name,
        is_active=siren.is_active,
        last_triggered_at=siren.last_triggered_at,
    )
