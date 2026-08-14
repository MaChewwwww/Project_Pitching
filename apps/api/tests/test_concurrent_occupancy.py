"""FR-EVC-002/004/005 and FR-SAF-019 concurrent physical occupancy."""

from __future__ import annotations

from factories import get_area, make_event, make_household
from sqlalchemy import select

from src.core.deps import AuthenticatedUser
from src.modules.evacuation import service
from src.modules.evacuation.models import EvacCenter, EvacCheckin
from src.modules.evacuation.schemas import EvacCheckinCreate
from src.modules.registry.models import Member
from src.modules.safety import service as safety_service


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


async def test_person_is_single_physical_occupant_across_concurrent_events(session, demo_users):
    actor = _actor(demo_users["admin"])
    area = await get_area(session)
    household = await make_household(session, area=area)
    member = await session.scalar(select(Member).where(Member.household_id == household.id))
    centers = list((await session.execute(select(EvacCenter).limit(2))).scalars())
    first_event = await make_event(session, name="Flood")
    second_event = await make_event(session, name="Fire", type="fire")

    first = await service.create_checkin(
        session,
        EvacCheckinCreate(
            evac_center_id=centers[0].id,
            event_id=first_event.id,
            member_id=member.id,
            person_name=member.full_name,
        ),
        actor=actor,
    )
    moved = await service.create_checkin(
        session,
        EvacCheckinCreate(
            evac_center_id=centers[-1].id,
            event_id=second_event.id,
            member_id=member.id,
            person_name=member.full_name,
        ),
        actor=actor,
    )

    assert moved.id == first.id
    open_rows = list(
        (
            await session.execute(
                select(EvacCheckin).where(
                    EvacCheckin.member_id == member.id,
                    EvacCheckin.checked_out_at.is_(None),
                )
            )
        ).scalars()
    )
    assert len(open_rows) == 1
    assert open_rows[0].event_id == second_event.id


async def test_intermediate_close_preserves_and_final_close_resets_occupancy(session, demo_users):
    actor = _actor(demo_users["admin"])
    area = await get_area(session)
    household = await make_household(session, area=area)
    member = await session.scalar(select(Member).where(Member.household_id == household.id))
    center = await session.scalar(select(EvacCenter))
    first_event = await make_event(session, name="First")
    second_event = await make_event(session, name="Second", type="fire")
    checkin = await service.create_checkin(
        session,
        EvacCheckinCreate(
            evac_center_id=center.id,
            event_id=first_event.id,
            member_id=member.id,
            person_name=member.full_name,
        ),
        actor=actor,
    )

    _ended, first_reset = await service.end_event(session, first_event.id, actor=actor, ip=None)
    assert first_reset == 0
    assert (await session.get(EvacCheckin, checkin.id)).checked_out_at is None

    _ended, final_reset = await service.end_event(session, second_event.id, actor=actor, ip=None)
    assert final_reset == 1
    assert (await session.get(EvacCheckin, checkin.id)).checked_out_at is not None


async def test_household_bulk_center_assignment_is_atomic_and_optional(session, demo_users):
    actor = _actor(demo_users["admin"])
    area = await get_area(session)
    household = await make_household(session, area=area, member_count=3)
    member_ids = list(
        (
            await session.execute(select(Member.id).where(Member.household_id == household.id))
        ).scalars()
    )
    center = await session.scalar(select(EvacCenter))
    center.capacity = 1
    flood = await make_event(session, name="Flood")

    await safety_service.set_household_status(
        session,
        event=flood,
        household_id=household.id,
        status="safe",
        actor=actor,
        set_method="household_bulk",
        acknowledged_member_ids=member_ids,
        evac_center_id=center.id,
    )
    open_rows = list(
        (
            await session.execute(
                select(EvacCheckin).where(
                    EvacCheckin.member_id.in_(member_ids),
                    EvacCheckin.checked_out_at.is_(None),
                )
            )
        ).scalars()
    )
    assert len(open_rows) == len(member_ids)
    assert {row.evac_center_id for row in open_rows} == {center.id}

    fire = await make_event(session, name="Fire", type="fire")
    await safety_service.set_household_status(
        session,
        event=fire,
        household_id=household.id,
        status="safe",
        actor=actor,
        set_method="household_bulk",
        acknowledged_member_ids=member_ids,
        evac_center_id=None,
    )
    retained = list(
        (
            await session.execute(select(EvacCheckin).where(EvacCheckin.checked_out_at.is_(None)))
        ).scalars()
    )
    assert len(retained) == len(member_ids)
    assert {row.evac_center_id for row in retained} == {center.id}

    public_center = next(
        row for row in await service.list_evac_centers_admin(session) if row.id == center.id
    )
    assert public_center.occupancy == len(member_ids)
    assert public_center.is_at_capacity is True
