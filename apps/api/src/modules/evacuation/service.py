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
from src.modules.evacuation.models import EmergencyEvent, EvacCenter, EvacCheckin
from src.modules.evacuation.schemas import (
    EmergencyEventDeclare,
    EmergencyEventOut,
    EvacCenterIn,
    EvacCheckinCreate,
    EvacCheckinOut,
    PortalEvacuationStatusOut,
    PublicEmergencyEvent,
    PublicEvacCenter,
)
from src.modules.geo.models import Area, Facility
from src.modules.geo.service import point_to_geojson


async def _occupancy_counts(session: AsyncSession) -> dict[uuid.UUID, int]:
    """Calculate active check-ins (where checked_out_at IS NULL) for the currently active event."""
    active_event = await get_active_event(session)
    if active_event is None:
        return {}
    rows = (
        await session.execute(
            select(EvacCheckin.evac_center_id, func.count(EvacCheckin.id))
            .where(
                EvacCheckin.event_id == active_event.id,
                EvacCheckin.checked_out_at.is_(None),
            )
            .group_by(EvacCheckin.evac_center_id)
        )
    ).all()
    return dict(rows)


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
    ec: EvacCenter, f: Facility, area_name: str | None, geojson: str | None, occupancy: int = 0
) -> PublicEvacCenter:
    from src.modules.geo.schemas import PublicFacility

    now = datetime.now(UTC)
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
    occ_map = await _occupancy_counts(session)
    rows = await _rows(session, open_only=open_only)
    items = [_to_public(ec, f, name, geojson, occ_map.get(ec.id, 0)) for ec, f, name, geojson in rows]
    total = len(items)
    start = (page - 1) * size
    return Page[PublicEvacCenter](items=items[start : start + size], **page_meta(total, page, size))


async def list_evac_centers_admin(session: AsyncSession) -> list[PublicEvacCenter]:
    occ_map = await _occupancy_counts(session)
    rows = await _rows(session, open_only=False)
    return [_to_public(ec, f, name, geojson, occ_map.get(ec.id, 0)) for ec, f, name, geojson in rows]


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
    event = await session.get(EmergencyEvent, event_id)
    if event is None:
        raise NotFoundError("Emergency event not found.")
    return event


async def require_active_event(session: AsyncSession) -> EmergencyEvent:
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
        await session.flush()

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


async def _checkin_to_out(session: AsyncSession, checkin: EvacCheckin) -> EvacCheckinOut:
    from src.modules.users.models import User

    ec = await session.get(EvacCenter, checkin.evac_center_id)
    evac_center_name = "Evacuation Center"
    if ec:
        facility = await session.get(Facility, ec.facility_id)
        if facility:
            evac_center_name = facility.name

    event = await session.get(EmergencyEvent, checkin.event_id)
    event_name = event.name if event else "Emergency Event"

    recorded_by_name = None
    if checkin.recorded_by_user_id:
        recorded_by_name = await session.scalar(
            select(User.full_name).where(User.id == checkin.recorded_by_user_id)
        )

    return EvacCheckinOut(
        id=checkin.id,
        evac_center_id=checkin.evac_center_id,
        evac_center_name=evac_center_name,
        event_id=checkin.event_id,
        event_name=event_name,
        member_id=checkin.member_id,
        unregistered_person_id=checkin.unregistered_person_id,
        person_name=checkin.person_name,
        checked_in_at=checkin.checked_in_at,
        checked_out_at=checkin.checked_out_at,
        recorded_by_user_id=checkin.recorded_by_user_id,
        recorded_by_name=recorded_by_name,
    )


async def create_checkin(
    session: AsyncSession, body: EvacCheckinCreate, *, actor: AuthenticatedUser
) -> EvacCheckinOut:
    center = await session.get(EvacCenter, body.evac_center_id)
    if center is None:
        raise NotFoundError("Evacuation center not found.")

    event_id = body.event_id
    if event_id is None:
        active_event = await require_active_event(session)
        event_id = active_event.id
    else:
        event = await get_event_or_404(session, event_id)
        event_id = event.id

    checkin = EvacCheckin(
        evac_center_id=body.evac_center_id,
        event_id=event_id,
        member_id=body.member_id,
        unregistered_person_id=body.unregistered_person_id,
        person_name=body.person_name,
        checked_in_at=body.checked_in_at or datetime.now(UTC),
        recorded_by_user_id=actor.id,
    )
    session.add(checkin)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="evac_checkin.create",
        entity_type="evac_checkin",
        entity_id=checkin.id,
        changes={"person_name": checkin.person_name},
    )
    await session.commit()
    return await _checkin_to_out(session, checkin)


async def checkout_checkin(
    session: AsyncSession, checkin_id: uuid.UUID, *, actor: AuthenticatedUser
) -> EvacCheckinOut:
    checkin = await session.get(EvacCheckin, checkin_id)
    if checkin is None:
        raise NotFoundError("Check-in record not found.")
    if checkin.checked_out_at is not None:
        raise ConflictError("Person is already checked out.")

    checkin.checked_out_at = datetime.now(UTC)
    await write_audit(
        session,
        actor_user_id=actor.id,
        action="evac_checkin.checkout",
        entity_type="evac_checkin",
        entity_id=checkin.id,
    )
    await session.commit()
    return await _checkin_to_out(session, checkin)


async def list_checkins_for_center(
    session: AsyncSession,
    evac_center_id: uuid.UUID,
    *,
    event_id: uuid.UUID | None = None,
    active_only: bool = False,
) -> list[EvacCheckinOut]:
    stmt = select(EvacCheckin).where(EvacCheckin.evac_center_id == evac_center_id)
    if event_id:
        stmt = stmt.where(EvacCheckin.event_id == event_id)
    if active_only:
        stmt = stmt.where(EvacCheckin.checked_out_at.is_(None))
    stmt = stmt.order_by(EvacCheckin.checked_in_at.desc())

    rows = (await session.execute(stmt)).scalars().all()
    return [await _checkin_to_out(session, r) for r in rows]


async def get_portal_evacuation_status(
    session: AsyncSession, actor: AuthenticatedUser
) -> PortalEvacuationStatusOut:
    from src.modules.registry.models import Household, Member

    household = await session.scalar(
        select(Household).where(Household.head_user_id == actor.id)
    )

    member_ids: list[uuid.UUID] = []
    if household:
        members = (
            await session.execute(
                select(Member.id).where(Member.household_id == household.id)
            )
        ).scalars().all()
        member_ids = list(members)

    if not member_ids:
        return PortalEvacuationStatusOut(
            is_currently_evacuated=False, active_checkin=None, history=[]
        )

    stmt = (
        select(EvacCheckin)
        .where(EvacCheckin.member_id.in_(member_ids))
        .order_by(EvacCheckin.checked_in_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()

    active_checkin_out: EvacCheckinOut | None = None
    history_outs: list[EvacCheckinOut] = []

    for r in rows:
        out = await _checkin_to_out(session, r)
        history_outs.append(out)
        if r.checked_out_at is None and active_checkin_out is None:
            active_checkin_out = out

    return PortalEvacuationStatusOut(
        is_currently_evacuated=active_checkin_out is not None,
        active_checkin=active_checkin_out,
        history=history_outs,
    )
