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
from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError, NotFoundError
from src.core.pagination import Page, page_meta, paginate
from src.modules.evacuation.models import EmergencyEvent, EvacCenter
from src.modules.evacuation.schemas import (
    EmergencyEventDeclare,
    EmergencyEventOut,
    EvacCenterIn,
    PublicEmergencyEvent,
    PublicEvacCenter,
)
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


async def event_out(session: AsyncSession, event: EmergencyEvent) -> EmergencyEventOut:
    declared_by_name = None
    if event.declared_by_user_id is not None:
        # join-only, same precedent as the Area/Facility imports above
        from src.modules.users.models import User

        declared_by_name = await session.scalar(
            select(User.full_name).where(User.id == event.declared_by_user_id)
        )
    return EmergencyEventOut(
        id=event.id,
        name=event.name,
        type=event.type,
        started_at=event.started_at,
        ended_at=event.ended_at,
        is_active=event.is_active,
        declared_by_user_id=event.declared_by_user_id,
        declared_by_name=declared_by_name,
    )


async def get_active_event(session: AsyncSession) -> EmergencyEvent | None:
    return await session.scalar(select(EmergencyEvent).where(EmergencyEvent.is_active.is_(True)))


async def get_event_or_404(session: AsyncSession, event_id: uuid.UUID) -> EmergencyEvent:
    """For callers (safety's accounted-for summary) that need a specific —
    possibly no-longer-active — event, not necessarily the current one. Same
    precedent as `geo.get_area_or_404`."""
    event = await session.get(EmergencyEvent, event_id)
    if event is None:
        raise NotFoundError("Emergency event not found.")
    return event


async def require_active_event(session: AsyncSession) -> EmergencyEvent:
    """The cross-module entry point every safety write depends on — matching the
    `get_event_names` (donations) and `geo.get_area_or_404` (registry) precedents."""
    event = await get_active_event(session)
    if event is None:
        raise ConflictError("There is no active emergency event.")
    return event


async def list_events(
    session: AsyncSession, *, page: int = 1, size: int = 20
) -> Page[EmergencyEventOut]:
    stmt = select(EmergencyEvent).order_by(EmergencyEvent.started_at.desc())
    rows, total = await paginate(session, stmt, page=page, size=size)
    items = [await event_out(session, row) for row in rows]
    return Page[EmergencyEventOut](items=items, **page_meta(total, page, size))


async def declare_event(
    session: AsyncSession,
    *,
    body: EmergencyEventDeclare,
    actor: AuthenticatedUser,
    ip: str | None,
) -> EmergencyEvent:
    """`idx_one_active_event` is a non-deferrable partial unique index — closing the
    previous event and inserting the new one must be ordered with a flush between
    them, or the insert races the still-live row and the database rejects it
    (the same `is_head` demotion-before-reparenting lesson from the registry merge).
    """
    active = await get_active_event(session)
    if active is not None:
        if not body.supersede_active:
            raise ConflictError(
                "An emergency event is already active. End it before declaring a new one."
            )
        active.is_active = False
        active.ended_at = datetime.now(UTC)
        await write_audit(
            session,
            actor_user_id=actor.id,
            action="emergency_event.superseded",
            entity_type="emergency_event",
            entity_id=active.id,
            changes={"name": active.name},
            ip=ip,
        )
        await session.flush()  # hazard #3 — must land before the new row is inserted

    event = EmergencyEvent(
        name=body.name,
        type=body.type,
        started_at=body.started_at or datetime.now(UTC),
        is_active=True,
        declared_by_user_id=actor.id,
    )
    session.add(event)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="emergency_event.declare",
        entity_type="emergency_event",
        entity_id=event.id,
        changes={"name": event.name, "type": event.type},
        ip=ip,
    )
    await session.commit()
    return event


async def end_event(
    session: AsyncSession, event_id: uuid.UUID, *, actor: AuthenticatedUser, ip: str | None
) -> EmergencyEvent:
    event = await session.get(EmergencyEvent, event_id)
    if event is None:
        raise NotFoundError("Emergency event not found.")
    if not event.is_active:
        raise ConflictError("This emergency event has already ended.")
    event.is_active = False
    event.ended_at = datetime.now(UTC)
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="emergency_event.end",
        entity_type="emergency_event",
        entity_id=event.id,
        ip=ip,
    )
    await session.commit()
    return event


async def get_public_active_event(session: AsyncSession) -> PublicEmergencyEvent | None:
    event = await get_active_event(session)
    if event is None:
        return None
    return PublicEmergencyEvent(name=event.name, type=event.type, started_at=event.started_at)


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
