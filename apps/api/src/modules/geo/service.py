"""Business logic and transaction boundaries for the geo module (FR-SYS-013, FR-SYS-015, FR-MAP-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import json
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import NotFoundError
from src.modules.geo.models import Area, Facility, Hotline
from src.modules.geo.schemas import (
    AreaOut,
    AreaPatch,
    FacilityIn,
    FacilityOut,
    GeoJsonPoint,
    HotlineIn,
    PublicArea,
    PublicFacility,
)


def point_to_geojson(location) -> GeoJsonPoint | None:
    """A GeoAlchemy2 `WKBElement` (or the raw GeoJSON string via ST_AsGeoJSON) → DTO."""
    if location is None:
        return None
    if isinstance(location, str):
        data = json.loads(location)
        return GeoJsonPoint(coordinates=tuple(data["coordinates"]))
    from geoalchemy2.shape import to_shape

    shape = to_shape(location)
    return GeoJsonPoint(coordinates=(shape.x, shape.y))


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


async def create_facility(
    session: AsyncSession, data: FacilityIn, *, actor_id: uuid.UUID
) -> Facility:
    facility = Facility(
        name=data.name,
        type=data.type,
        address=data.address,
        contact_number=data.contact_number,
        area_id=data.area_id,
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
    facility.name = data.name
    facility.type = data.type
    facility.address = data.address
    facility.contact_number = data.contact_number
    facility.area_id = data.area_id
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
    await session.delete(facility)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.delete",
        entity_type="facility",
        entity_id=facility_id,
    )
    await session.commit()


async def facility_out(session: AsyncSession, facility: Facility) -> FacilityOut:
    geojson = (
        await session.execute(
            select(func.ST_AsGeoJSON(Facility.location)).where(Facility.id == facility.id)
        )
    ).scalar_one()
    return FacilityOut(
        id=facility.id,
        name=facility.name,
        type=facility.type,
        address=facility.address,
        contact_number=facility.contact_number,
        location=point_to_geojson(geojson),
        area_id=facility.area_id,
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
