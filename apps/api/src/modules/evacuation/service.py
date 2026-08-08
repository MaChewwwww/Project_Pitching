"""Business logic and transaction boundaries for the evacuation module (FR-EVC-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import NotFoundError
from src.core.pagination import Page, page_meta
from src.modules.evacuation.models import EmergencyEvent, EvacCenter
from src.modules.evacuation.schemas import EvacCenterIn, PublicEvacCenter
from src.modules.geo.models import Area, Facility
from src.modules.geo.service import point_to_geojson


async def _rows(session: AsyncSession, *, open_only: bool):
    stmt = (
        select(EvacCenter, Facility, Area.name, func.ST_AsGeoJSON(Facility.location))
        .join(Facility, EvacCenter.facility_id == Facility.id)
        .outerjoin(Area, Facility.area_id == Area.id)
        .order_by(Facility.name)
    )
    if open_only:
        stmt = stmt.where(EvacCenter.is_open.is_(True))
    return (await session.execute(stmt)).all()


def _to_public(
    ec: EvacCenter, f: Facility, area_name: str | None, geojson: str | None
) -> PublicEvacCenter:
    from src.modules.geo.schemas import PublicFacility

    now = datetime.now(UTC)
    occupancy = 0  # evac_checkin deferred — see schemas.py docstring
    occupancy_pct = None if not ec.capacity else round(100 * occupancy / ec.capacity, 1)
    return PublicEvacCenter(
        id=ec.id,
        capacity=ec.capacity,
        is_open=ec.is_open,
        notes=ec.notes,
        contact_number=ec.contact_number,
        facility=PublicFacility(
            id=f.id,
            name=f.name,
            type=f.type,
            address=f.address,
            contact_number=f.contact_number,
            location=point_to_geojson(geojson),
            area_id=f.area_id,
            area_name=area_name,
        ),
        occupancy=occupancy,
        occupancy_pct=occupancy_pct,
        is_at_capacity=bool(ec.capacity and occupancy >= ec.capacity),
        occupancy_as_of=now,
    )


async def list_evac_centers(
    session: AsyncSession, *, page: int = 1, size: int = 20, open_only: bool = True
) -> Page[PublicEvacCenter]:
    rows = await _rows(session, open_only=open_only)
    items = [_to_public(ec, f, name, geojson) for ec, f, name, geojson in rows]
    total = len(items)
    start = (page - 1) * size
    return Page[PublicEvacCenter](items=items[start : start + size], **page_meta(total, page, size))


async def list_evac_centers_admin(session: AsyncSession) -> list[PublicEvacCenter]:
    rows = await _rows(session, open_only=False)
    return [_to_public(ec, f, name, geojson) for ec, f, name, geojson in rows]


async def count_total(session: AsyncSession) -> int:
    return (await session.execute(select(func.count(EvacCenter.id)))).scalar_one()


async def count_by_area(session: AsyncSession) -> dict[uuid.UUID, int]:
    rows = (
        await session.execute(
            select(Facility.area_id, func.count(EvacCenter.id))
            .join(Facility, EvacCenter.facility_id == Facility.id)
            .where(Facility.area_id.is_not(None))
            .group_by(Facility.area_id)
        )
    ).all()
    return dict(rows)


async def get_event_names(
    session: AsyncSession, event_ids: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """The one thing other modules (donations) need from `emergency_event` — a
    name lookup — exposed as a service function rather than a shared model import
    (AGENTS.md Section 5, rule 2)."""
    if not event_ids:
        return {}
    rows = (
        await session.execute(
            select(EmergencyEvent.id, EmergencyEvent.name).where(EmergencyEvent.id.in_(event_ids))
        )
    ).all()
    return {row[0]: row[1] for row in rows}


async def create_evac_center(
    session: AsyncSession, data: EvacCenterIn, *, actor_id: uuid.UUID
) -> EvacCenter:
    center = EvacCenter(**data.model_dump())
    session.add(center)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="evac_center.create",
        entity_type="evac_center",
        entity_id=center.id,
    )
    await session.commit()
    return center


async def update_evac_center(
    session: AsyncSession, center_id: uuid.UUID, data: EvacCenterIn, *, actor_id: uuid.UUID
) -> EvacCenter:
    center = await session.get(EvacCenter, center_id)
    if center is None:
        raise NotFoundError("Evacuation center not found.")
    for key, value in data.model_dump().items():
        setattr(center, key, value)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="evac_center.update",
        entity_type="evac_center",
        entity_id=center.id,
    )
    await session.commit()
    return center
