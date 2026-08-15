"""Business logic and transaction boundaries for the evacuation module (FR-EVC-*).

Services own transaction boundaries. Read-only identity/facility joins may use
another module's models; writes remain behind the owning service boundary
(AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from src.core.pagination import Page, page_meta, paginate
from src.modules.evacuation.models import EmergencyEvent, EvacCenter, EvacCheckin
from src.modules.evacuation.schemas import (
    AdminEvacCenterIn,
    AdminEvacCenterOut,
    EmergencyEventDeclare,
    EmergencyEventDetailOut,
    EmergencyEventOut,
    EmergencyEventPatch,
    EmergencyEventStats,
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
    """Count physical people once, independent of how many events are active."""
    rows = (
        await session.execute(
            select(EvacCheckin.evac_center_id, func.count(EvacCheckin.id))
            .where(EvacCheckin.checked_out_at.is_(None))
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
        stmt = stmt.where(EvacCenter.is_open.is_(True), Facility.is_active.is_(True))
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
    items = [
        _to_public(ec, f, name, geojson, occ_map.get(ec.id, 0)) for ec, f, name, geojson in rows
    ]
    total = len(items)
    start = (page - 1) * size
    return Page[PublicEvacCenter](items=items[start : start + size], **page_meta(total, page, size))


async def list_evac_centers_admin(session: AsyncSession) -> list[PublicEvacCenter]:
    occ_map = await _occupancy_counts(session)
    rows = await _rows(session, open_only=False)
    return [
        _to_public(ec, f, name, geojson, occ_map.get(ec.id, 0)) for ec, f, name, geojson in rows
    ]


def _to_admin(
    ec: EvacCenter, f: Facility, area_name: str | None, geojson: str | None, occupancy: int
) -> AdminEvacCenterOut:
    from src.modules.geo.schemas import AdminFacilityOut

    public = _to_public(ec, f, area_name, geojson, occupancy)
    facility = AdminFacilityOut(**public.facility.model_dump(), is_active=f.is_active)
    return AdminEvacCenterOut(
        **public.model_dump(exclude={"facility"}),
        contact_person=ec.contact_person,
        is_active=f.is_active,
        facility=facility,
    )


async def list_admin_evac_centers(session: AsyncSession) -> list[AdminEvacCenterOut]:
    occ_map = await _occupancy_counts(session)
    rows = await _rows(session, open_only=False)
    return [
        _to_admin(ec, facility, area_name, geojson, occ_map.get(ec.id, 0))
        for ec, facility, area_name, geojson in rows
    ]


async def get_admin_evac_center(session: AsyncSession, center_id: uuid.UUID) -> AdminEvacCenterOut:
    rows = await _rows(session, open_only=False)
    for ec, facility, area_name, geojson in rows:
        if ec.id == center_id:
            occupancy = (await _occupancy_counts(session)).get(ec.id, 0)
            return _to_admin(ec, facility, area_name, geojson, occupancy)
    raise NotFoundError("Evacuation center not found.")


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


async def event_out(
    session: AsyncSession, event: EmergencyEvent, *, occupancy_reset_count: int = 0
) -> EmergencyEventOut:
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
        occupancy_reset_count=occupancy_reset_count,
    )


async def get_active_event(session: AsyncSession) -> EmergencyEvent | None:
    """Compatibility read: return an event only when selection is unambiguous."""
    events = await list_active_events(session, limit=2)
    return events[0] if len(events) == 1 else None


async def list_active_events(
    session: AsyncSession, *, limit: int | None = None
) -> list[EmergencyEvent]:
    stmt = (
        select(EmergencyEvent)
        .where(EmergencyEvent.is_active.is_(True))
        .order_by(EmergencyEvent.started_at.desc(), EmergencyEvent.id.desc())
    )
    if limit is not None:
        stmt = stmt.limit(limit)
    return list((await session.execute(stmt)).scalars().all())


async def get_event_or_404(session: AsyncSession, event_id: uuid.UUID) -> EmergencyEvent:
    event = await session.get(EmergencyEvent, event_id)
    if event is None:
        raise NotFoundError("Emergency event not found.")
    return event


async def require_active_event(
    session: AsyncSession, event_id: uuid.UUID | None = None
) -> EmergencyEvent:
    if event_id is not None:
        event = await get_event_or_404(session, event_id)
        if not event.is_active:
            raise ConflictError("The selected emergency event has ended.")
        return event

    events = await list_active_events(session, limit=2)
    if not events:
        raise ConflictError("There is no active emergency event.")
    if len(events) > 1:
        raise ConflictError("Multiple emergency events are active. Select an event.")
    return events[0]


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
    event = EmergencyEvent(
        name=body.name,
        type=body.type,
        started_at=body.started_at or datetime.now(UTC),
        is_active=True,
        declared_by_user_id=actor.id,
    )
    session.add(event)
    await session.flush()

    if event.type == "flood":
        from src.modules.weather import service as weather_service

        await weather_service.create_flood_event_from_emergency(
            session,
            emergency_event_id=event.id,
            name=event.name,
            started_at=event.started_at,
        )

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
    session: AsyncSession,
    event_id: uuid.UUID,
    *,
    actor: AuthenticatedUser,
    ip: str | None,
    ended_at: datetime | None = None,
) -> tuple[EmergencyEvent, int]:
    event = await session.get(EmergencyEvent, event_id)
    if event is None:
        raise NotFoundError("Emergency event not found.")
    if not event.is_active:
        raise ConflictError("This emergency event has already ended.")
    event.is_active = False
    event.ended_at = ended_at or datetime.now(UTC)

    if event.type == "flood":
        from src.modules.weather import service as weather_service

        await weather_service.finalize_flood_event_from_emergency(
            session, emergency_event_id=event.id, ended_at=event.ended_at
        )

    remaining_active = await session.scalar(
        select(func.count(EmergencyEvent.id)).where(EmergencyEvent.is_active.is_(True))
    )
    reset_count = 0
    if remaining_active == 0:
        result = await session.execute(
            update(EvacCheckin)
            .where(EvacCheckin.checked_out_at.is_(None))
            .values(checked_out_at=event.ended_at, updated_at=event.ended_at)
        )
        reset_count = result.rowcount or 0

    await write_audit(
        session,
        actor_user_id=actor.id,
        action="emergency_event.end",
        entity_type="emergency_event",
        entity_id=event.id,
        changes={"occupancy_reset_count": reset_count},
        ip=ip,
    )
    await session.commit()
    return event, reset_count


async def get_event_detail(session: AsyncSession, event_id: uuid.UUID) -> EmergencyEventDetailOut:
    event = await get_event_or_404(session, event_id)
    base_out = await event_out(session, event)

    from src.modules.safety.models import (
        IncidentReport,
        RescueRequest,
        SafetyStatus,
        UnregisteredPerson,
    )
    from src.modules.weather.models import FloodEvent

    total_checkins = (
        await session.scalar(
            select(func.count(SafetyStatus.id)).where(
                SafetyStatus.event_id == event_id, SafetyStatus.superseded_at.is_(None)
            )
        )
    ) or 0

    safe_count = (
        await session.scalar(
            select(func.count(SafetyStatus.id)).where(
                SafetyStatus.event_id == event_id,
                SafetyStatus.superseded_at.is_(None),
                SafetyStatus.status == "safe",
            )
        )
    ) or 0

    rescue_needed = (
        await session.scalar(
            select(func.count(SafetyStatus.id)).where(
                SafetyStatus.event_id == event_id,
                SafetyStatus.superseded_at.is_(None),
                SafetyStatus.status == "needs_rescue",
            )
        )
    ) or 0

    total_evacuees = (
        await session.scalar(
            select(func.count(EvacCheckin.id)).where(EvacCheckin.event_id == event_id)
        )
    ) or 0

    active_centers = (
        await session.scalar(
            select(func.count(func.distinct(EvacCheckin.evac_center_id))).where(
                EvacCheckin.event_id == event_id
            )
        )
    ) or 0

    total_rescues = (
        await session.scalar(
            select(func.count(RescueRequest.id)).where(RescueRequest.event_id == event_id)
        )
    ) or 0

    open_rescues = (
        await session.scalar(
            select(func.count(RescueRequest.id)).where(
                RescueRequest.event_id == event_id,
                RescueRequest.status.in_(("pending", "verified", "dispatched")),
            )
        )
    ) or 0

    total_incidents = (
        await session.scalar(
            select(func.count(IncidentReport.id)).where(IncidentReport.event_id == event_id)
        )
    ) or 0

    verified_incidents = (
        await session.scalar(
            select(func.count(IncidentReport.id)).where(
                IncidentReport.event_id == event_id,
                IncidentReport.status == "verified",
            )
        )
    ) or 0

    total_unregistered = (
        await session.scalar(
            select(func.count(UnregisteredPerson.id)).where(UnregisteredPerson.event_id == event_id)
        )
    ) or 0

    linked_flood_id = None
    if event.type == "flood":
        linked_flood_id = await session.scalar(
            select(FloodEvent.id).where(FloodEvent.emergency_event_id == event_id)
        )

    stats = EmergencyEventStats(
        total_checkins_count=total_checkins,
        total_safe_count=safe_count,
        total_rescue_needed_count=rescue_needed,
        total_unaccounted_count=0,
        total_evacuees_count=total_evacuees,
        active_centers_used=active_centers,
        total_rescue_requests_count=total_rescues,
        open_rescue_requests_count=open_rescues,
        total_incident_reports_count=total_incidents,
        verified_incident_reports_count=verified_incidents,
        total_unregistered_count=total_unregistered,
        linked_flood_event_id=linked_flood_id,
    )

    return EmergencyEventDetailOut(
        **base_out.model_dump(),
        stats=stats,
    )


async def update_event(
    session: AsyncSession,
    event_id: uuid.UUID,
    *,
    body: EmergencyEventPatch,
    actor: AuthenticatedUser,
    ip: str | None,
) -> EmergencyEventDetailOut:
    event = await get_event_or_404(session, event_id)
    changes: dict[str, object] = {}

    if body.name is not None and body.name.strip():
        changes["name"] = body.name.strip()
        event.name = body.name.strip()

    if body.type is not None:
        changes["type"] = body.type
        event.type = body.type

    if body.started_at is not None:
        changes["started_at"] = body.started_at.isoformat()
        event.started_at = body.started_at

    if body.ended_at is not None:
        changes["ended_at"] = body.ended_at.isoformat()
        event.ended_at = body.ended_at

    if body.is_active is not None:
        changes["is_active"] = body.is_active
        event.is_active = body.is_active
        if not event.is_active and event.ended_at is None:
            event.ended_at = datetime.now(UTC)

    if event.type == "flood":
        from src.modules.weather.models import FloodEvent

        flood_event = await session.scalar(
            select(FloodEvent).where(FloodEvent.emergency_event_id == event.id)
        )
        if flood_event is not None:
            if body.name is not None:
                flood_event.name = event.name
            if body.started_at is not None:
                flood_event.started_at = event.started_at
            if body.ended_at is not None:
                flood_event.ended_at = event.ended_at
            if body.is_active is not None:
                flood_event.is_ongoing = event.is_active

    await write_audit(
        session,
        actor_user_id=actor.id,
        action="emergency_event.update",
        entity_type="emergency_event",
        entity_id=event.id,
        changes=changes,
        ip=ip,
    )
    await session.commit()
    return await get_event_detail(session, event_id)


async def delete_event(
    session: AsyncSession,
    event_id: uuid.UUID,
    *,
    actor: AuthenticatedUser,
    ip: str | None,
) -> None:
    event = await get_event_or_404(session, event_id)
    event_name = event.name
    was_active = event.is_active

    await session.delete(event)
    await session.flush()

    if was_active:
        remaining_active = await session.scalar(
            select(func.count(EmergencyEvent.id)).where(EmergencyEvent.is_active.is_(True))
        )
        if remaining_active == 0:
            now = datetime.now(UTC)
            await session.execute(
                update(EvacCheckin)
                .where(EvacCheckin.checked_out_at.is_(None))
                .values(checked_out_at=now, updated_at=now)
            )

    await write_audit(
        session,
        actor_user_id=actor.id,
        action="emergency_event.delete",
        entity_type="emergency_event",
        entity_id=event_id,
        changes={"name": event_name},
        ip=ip,
    )
    await session.commit()


async def get_public_active_events(session: AsyncSession) -> list[PublicEmergencyEvent]:
    return [
        PublicEmergencyEvent(
            id=event.id, name=event.name, type=event.type, started_at=event.started_at
        )
        for event in await list_active_events(session)
    ]


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


async def create_admin_evac_center(
    session: AsyncSession, data: AdminEvacCenterIn, *, actor_id: uuid.UUID
) -> AdminEvacCenterOut:
    from src.modules.geo import service as geo_service

    area = await geo_service.area_for_point(
        session, data.facility.latitude, data.facility.longitude
    )
    if area is None:
        raise ValidationError("Choose a location inside Barangay San Jose.")
    facility = Facility(
        name=data.facility.name.strip(),
        type="evacuation_center",
        address=data.facility.address,
        contact_number=data.facility.contact_number,
        area_id=area.id,
        is_active=True,
        location=func.ST_SetSRID(
            func.ST_MakePoint(data.facility.longitude, data.facility.latitude), 4326
        ),
    )
    session.add(facility)
    await session.flush()
    center = EvacCenter(
        facility_id=facility.id,
        capacity=data.capacity,
        contact_person=data.contact_person,
        contact_number=data.contact_number,
        is_open=data.is_open,
        notes=data.notes,
    )
    session.add(center)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.create",
        entity_type="facility",
        entity_id=facility.id,
    )
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="evac_center.create",
        entity_type="evac_center",
        entity_id=center.id,
    )
    await session.commit()
    return await get_admin_evac_center(session, center.id)


async def update_admin_evac_center(
    session: AsyncSession, center_id: uuid.UUID, data: AdminEvacCenterIn, *, actor_id: uuid.UUID
) -> AdminEvacCenterOut:
    from src.modules.geo import service as geo_service

    center = await session.get(EvacCenter, center_id)
    if center is None:
        raise NotFoundError("Evacuation center not found.")
    facility = await session.get(Facility, center.facility_id)
    if facility is None:
        raise NotFoundError("Linked facility not found.")
    area = await geo_service.area_for_point(
        session, data.facility.latitude, data.facility.longitude
    )
    if area is None:
        raise ValidationError("Choose a location inside Barangay San Jose.")
    facility.name = data.facility.name.strip()
    facility.address = data.facility.address
    facility.contact_number = data.facility.contact_number
    facility.area_id = area.id
    facility.location = func.ST_SetSRID(
        func.ST_MakePoint(data.facility.longitude, data.facility.latitude), 4326
    )
    center.capacity = data.capacity
    center.contact_person = data.contact_person
    center.contact_number = data.contact_number
    center.is_open = data.is_open
    center.notes = data.notes
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="facility.update",
        entity_type="facility",
        entity_id=facility.id,
    )
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="evac_center.update",
        entity_type="evac_center",
        entity_id=center.id,
    )
    await session.commit()
    return await get_admin_evac_center(session, center.id)


async def deactivate_evac_center(
    session: AsyncSession, center_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    center = await session.get(EvacCenter, center_id)
    if center is None:
        raise NotFoundError("Evacuation center not found.")
    active_checkins = await session.scalar(
        select(func.count(EvacCheckin.id)).where(
            EvacCheckin.evac_center_id == center_id, EvacCheckin.checked_out_at.is_(None)
        )
    )
    if active_checkins:
        raise ConflictError("Check out active evacuees before deactivating this center.")
    facility = await session.get(Facility, center.facility_id)
    if facility is not None:
        facility.is_active = False
    center.is_open = False
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="evac_center.deactivate",
        entity_type="evac_center",
        entity_id=center.id,
    )
    await session.commit()


async def reactivate_evac_center(
    session: AsyncSession, center_id: uuid.UUID, *, actor_id: uuid.UUID
) -> AdminEvacCenterOut:
    center = await session.get(EvacCenter, center_id)
    if center is None:
        raise NotFoundError("Evacuation center not found.")
    facility = await session.get(Facility, center.facility_id)
    if facility is None:
        raise NotFoundError("Linked facility not found.")
    facility.is_active = True
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="evac_center.reactivate",
        entity_type="evac_center",
        entity_id=center.id,
    )
    await session.commit()
    return await get_admin_evac_center(session, center.id)


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
    session: AsyncSession,
    body: EvacCheckinCreate,
    *,
    actor: AuthenticatedUser,
    commit: bool = True,
) -> EvacCheckinOut:
    center = await session.get(EvacCenter, body.evac_center_id)
    if center is None:
        raise NotFoundError("Evacuation center not found.")

    event_id = body.event_id
    if event_id is None:
        active_event = await require_active_event(session)
        event_id = active_event.id
    else:
        event = await require_active_event(session, event_id)
        event_id = event.id

    if (body.member_id is None) == (body.unregistered_person_id is None):
        raise ConflictError("Select exactly one registered or unregistered person.")

    if body.member_id is not None:
        from src.modules.registry.models import Household, Member  # read-only validation

        member = await session.scalar(
            select(Member).where(Member.id == body.member_id, Member.deleted_at.is_(None))
        )
        if member is None:
            raise NotFoundError("Registered member not found.")
        if actor.is_area_scoped:
            allowed = await session.scalar(
                select(Household.id).where(
                    Household.id == member.household_id,
                    Household.area_id.in_(actor.assigned_area_ids),
                    Household.deleted_at.is_(None),
                )
            )
            if allowed is None:
                raise PermissionDeniedError("This member is outside your assigned area.")
        subject_name = member.full_name
    else:
        from src.modules.safety.models import UnregisteredPerson  # read-only validation

        person = await session.get(UnregisteredPerson, body.unregistered_person_id)
        if person is None:
            raise NotFoundError("Unregistered person not found.")
        if person.event_id != event_id:
            raise ConflictError("This unregistered person belongs to a different event.")
        if person.converted_member_id is not None:
            raise ConflictError("This person has already been converted to an official member.")
        subject_name = person.full_name

    subject_filter = (
        EvacCheckin.member_id == body.member_id
        if body.member_id is not None
        else EvacCheckin.unregistered_person_id == body.unregistered_person_id
    )
    existing = await session.scalar(
        select(EvacCheckin).where(subject_filter, EvacCheckin.checked_out_at.is_(None))
    )
    if existing is not None:
        moved = existing.evac_center_id != body.evac_center_id
        existing.evac_center_id = body.evac_center_id
        existing.event_id = event_id
        existing.person_name = subject_name
        existing.recorded_by_user_id = actor.id
        existing.updated_at = datetime.now(UTC)
        await write_audit(
            session,
            actor_user_id=actor.id,
            action="evac_checkin.move" if moved else "evac_checkin.retain",
            entity_type="evac_checkin",
            entity_id=existing.id,
            changes={"evac_center_id": str(existing.evac_center_id), "event_id": str(event_id)},
        )
        if commit:
            await session.commit()
        else:
            await session.flush()
        return await _checkin_to_out(session, existing)

    checkin = EvacCheckin(
        evac_center_id=body.evac_center_id,
        event_id=event_id,
        member_id=body.member_id,
        unregistered_person_id=body.unregistered_person_id,
        person_name=subject_name,
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
    if commit:
        await session.commit()
    else:
        await session.flush()
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


async def transfer_unregistered_checkin(
    session: AsyncSession,
    *,
    unregistered_person_id: uuid.UUID,
    member_id: uuid.UUID,
    person_name: str,
) -> None:
    """Preserve a physical arrival while replacing its temporary registry identity."""
    checkin = await session.scalar(
        select(EvacCheckin).where(
            EvacCheckin.unregistered_person_id == unregistered_person_id,
            EvacCheckin.checked_out_at.is_(None),
        )
    )
    if checkin is None:
        return
    checkin.unregistered_person_id = None
    checkin.member_id = member_id
    checkin.person_name = person_name
    checkin.updated_at = datetime.now(UTC)
    await session.flush()


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

    household = await session.scalar(select(Household).where(Household.head_user_id == actor.id))

    member_ids: list[uuid.UUID] = []
    if household:
        members = (
            (await session.execute(select(Member.id).where(Member.household_id == household.id)))
            .scalars()
            .all()
        )
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
