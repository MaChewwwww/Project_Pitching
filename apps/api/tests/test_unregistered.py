"""FR-SAF-012/013 — recording an unregistered person as safe or needing
rescue, in one action, without touching the registered coverage figures.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from factories import get_area, make_event, make_household
from sqlalchemy import select

from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError
from src.modules.registry import service as registry_service
from src.modules.registry.schemas import MemberFromUnregisteredIn
from src.modules.safety import service
from src.modules.safety.models import SafetyStatus
from src.modules.safety.schemas import UnregisteredPersonIn, UnregisteredPersonPatch


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


async def test_creating_without_an_active_event_conflicts(session, demo_users):
    admin = _actor(demo_users["admin"])
    body = UnregisteredPersonIn(
        full_name="Someone at the bridge",
        location_note="Near the bridge",
        initial_status="safe",
    )
    with pytest.raises(ConflictError):
        await service.create_unregistered(session, body=body, actor=admin, ip=None)


async def test_create_writes_the_initial_status_in_the_same_action(session, demo_users):
    await make_event(session)
    admin = _actor(demo_users["admin"])
    body = UnregisteredPersonIn(
        full_name="Someone needing rescue",
        location_note="Purok 2",
        initial_status="needs_rescue",
    )
    out = await service.create_unregistered(session, body=body, actor=admin, ip=None)
    assert out.status == "needs_rescue"

    status_row = (
        await session.execute(
            select(SafetyStatus).where(SafetyStatus.unregistered_person_id == out.id)
        )
    ).scalar_one()
    assert status_row.set_method == "assisted"
    assert status_row.superseded_at is None


async def test_create_preserves_a_backfilled_status_time_and_center_checkin(session, demo_users):
    from src.modules.evacuation.models import EvacCenter, EvacCheckin

    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    center = await session.scalar(select(EvacCenter))
    assert center is not None
    field_time = datetime(2026, 8, 12, 9, 30, tzinfo=UTC)

    out = await service.create_unregistered(
        session,
        body=UnregisteredPersonIn(
            event_id=event.id,
            evac_center_id=center.id,
            full_name="Paper roster walk-in",
            initial_status="safe",
            set_at=field_time,
        ),
        actor=admin,
        ip=None,
    )

    assert out.status_set_at == field_time
    checkin = await session.scalar(
        select(EvacCheckin).where(EvacCheckin.unregistered_person_id == out.id)
    )
    assert checkin is not None
    assert checkin.checked_in_at == field_time


async def test_registered_totals_do_not_move_when_an_unregistered_person_is_added(
    session, demo_users
):
    """FR-SAF-013's real assertion — an unregistered person must never be
    countable against registered coverage figures."""
    area = await get_area(session)
    await make_household(session, area=area, member_count=3)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])

    before = await service.accounted_for_summary(session, event=event, user=admin)
    before_total = before.registered_total.registered_members

    body = UnregisteredPersonIn(
        full_name="Someone safe",
        location_note="Elsewhere",
        initial_status="safe",
    )
    await service.create_unregistered(session, body=body, actor=admin, ip=None)

    after = await service.accounted_for_summary(session, event=event, user=admin)
    assert after.registered_total.registered_members == before_total
    assert after.unregistered_safe >= 1


async def test_location_is_optional():
    body = UnregisteredPersonIn(full_name="No location given", initial_status="safe", is_pwd=True)
    assert body.latitude is None
    assert body.location_note is None
    assert body.is_pwd is True


async def test_update_edits_details_without_touching_status(session, demo_users):
    await make_event(session)
    admin = _actor(demo_users["admin"])
    created = await service.create_unregistered(
        session,
        body=UnregisteredPersonIn(
            full_name="Original Name", location_note="Somewhere", initial_status="safe"
        ),
        actor=admin,
        ip=None,
    )

    updated = await service.update_unregistered(
        session,
        created.id,
        body=UnregisteredPersonPatch(full_name="Corrected Name"),
        actor=admin,
        ip=None,
    )
    assert updated.full_name == "Corrected Name"
    assert updated.status == "safe"


async def test_conversion_transfers_status_once_and_keeps_history(session, demo_users):
    area = await get_area(session)
    household = await make_household(session, area=area)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    person = await service.create_unregistered(
        session,
        body=UnregisteredPersonIn(
            event_id=event.id,
            full_name="Walk-in Resident",
            initial_status="safe",
            is_pwd=True,
        ),
        actor=admin,
        ip=None,
    )
    member = await registry_service.add_member_from_unregistered(
        session,
        household_id=household.id,
        body=MemberFromUnregisteredIn(
            unregistered_person_id=person.id,
            birth_date=date(1990, 1, 1),
            sex="female",
            relationship_to_head="Sibling",
        ),
        actor=admin,
    )
    converted = await service.get_unregistered_or_404(session, person.id)
    assert converted.converted_member_id == member.id
    assert converted.converted_household_id == household.id
    assert member.is_pwd is True
    member_status = await session.scalar(
        select(SafetyStatus).where(
            SafetyStatus.event_id == event.id,
            SafetyStatus.member_id == member.id,
            SafetyStatus.superseded_at.is_(None),
        )
    )
    assert member_status.status == "safe"

    with pytest.raises(ConflictError):
        await registry_service.add_member_from_unregistered(
            session,
            household_id=household.id,
            body=MemberFromUnregisteredIn(
                unregistered_person_id=person.id,
                birth_date=date(1990, 1, 1),
                sex="female",
                relationship_to_head="Sibling",
            ),
            actor=admin,
        )
