"""FR-SAF-001…007, 011, 013 — safety check-in and the accounted-for dashboard.

`safety_status` is append-only (docs/schema.md) — a correction inserts a new
row and sets `superseded_at` on the old one; `status` is never `UPDATE`d.
These tests assert that directly, and that the two unique partial indexes
(`uq_safety_current_member`/`uq_safety_current_unreg`) actually enforce "at
most one current row per subject" rather than just being decorative.
"""

from __future__ import annotations

import uuid

import pytest
from factories import get_area, make_event, make_household
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError
from src.modules.registry.models import Household, Member
from src.modules.safety import service
from src.modules.safety.models import SafetyStatus
from src.modules.safety.schemas import SafetyStatusAdminIn


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


async def _member_ids(session, household: Household) -> list[uuid.UUID]:
    rows = await session.execute(select(Member.id).where(Member.household_id == household.id))
    return list(rows.scalars().all())


async def test_correction_inserts_a_new_row_and_never_updates_status(session, demo_users):
    area = await get_area(session)
    household = await make_household(session, area=area, member_count=2)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    member_id = (await _member_ids(session, household))[0]

    first = await service._write_one_status(
        session,
        event_id=event.id,
        member_id=member_id,
        status="safe",
        actor=admin,
        set_method="assisted",
        ip=None,
    )
    second = await service._write_one_status(
        session,
        event_id=event.id,
        member_id=member_id,
        status="needs_rescue",
        actor=admin,
        set_method="assisted",
        ip=None,
    )

    await session.refresh(first)
    assert first.superseded_at is not None
    assert first.status == "safe"  # never UPDATEd
    assert second.superseded_at is None
    assert second.status == "needs_rescue"

    rows = (
        (await session.execute(select(SafetyStatus).where(SafetyStatus.member_id == member_id)))
        .scalars()
        .all()
    )
    assert len(rows) == 2  # a correction is an insert, never an in-place edit


async def test_writing_without_superseding_violates_the_unique_index(session, demo_users):
    """Proves the unique partial indexes are load-bearing, not decorative —
    bypass `_write_one_status`'s supersede-then-insert order and confirm the
    database itself refuses a second live row."""
    area = await get_area(session)
    household = await make_household(session, area=area)
    event = await make_event(session)
    member_id = (await _member_ids(session, household))[0]

    session.add(
        SafetyStatus(
            event_id=event.id,
            member_id=member_id,
            status="safe",
            set_by_user_id=demo_users["admin"].id,
            set_method="assisted",
        )
    )
    await session.flush()

    session.add(
        SafetyStatus(
            event_id=event.id,
            member_id=member_id,
            status="needs_rescue",
            set_by_user_id=demo_users["admin"].id,
            set_method="assisted",
        )
    )
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_household_bulk_requires_exact_roster_match(session, demo_users):
    area = await get_area(session)
    household = await make_household(session, area=area, member_count=3)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    member_ids = await _member_ids(session, household)

    with pytest.raises(ConflictError):
        await service.set_household_status(
            session,
            event=event,
            household_id=household.id,
            status="safe",
            actor=admin,
            set_method="household_bulk",
            acknowledged_member_ids=member_ids[:-1],  # missing one member
            ip=None,
        )


async def test_household_bulk_succeeds_with_the_full_roster(session, demo_users):
    area = await get_area(session)
    household = await make_household(session, area=area, member_count=3)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    member_ids = await _member_ids(session, household)

    result = await service.set_household_status(
        session,
        event=event,
        household_id=household.id,
        status="safe",
        actor=admin,
        set_method="household_bulk",
        acknowledged_member_ids=member_ids,
        ip=None,
    )
    assert all(m.status == "safe" for m in result.members)
    assert all(m.set_method == "household_bulk" for m in result.members)


async def test_me_endpoint_ignores_client_supplied_set_method(head_client, session, demo_users):
    """`set_method` is never accepted from the client — posting one anyway
    must still store `self`, or a resident could forge barangay confirmation
    and destroy FR-SAF-005's confidence distinction."""
    area = await get_area(session)
    head = demo_users["head"]
    household = await make_household(session, area=area, head_user_id=head.id, member_count=1)
    await make_event(session)
    await session.commit()  # visible to the request's own transaction

    member_id = (await _member_ids(session, household))[0]
    response = await head_client.post(
        "/api/v1/me/safety-status",
        json={
            "status": "safe",
            "scope": "member",
            "member_ids": [str(member_id)],
            "set_method": "assisted",  # attempted forgery — must be ignored
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["members"][0]["set_method"] == "self"


async def test_accounted_for_tallies_add_up_per_area(session, demo_users):
    area = await get_area(session)
    household = await make_household(session, area=area, member_count=4)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    member_ids = await _member_ids(session, household)

    await service.set_member_statuses(
        session,
        event=event,
        household_id=household.id,
        member_ids=[member_ids[0]],
        status="safe",
        actor=admin,
        set_method="assisted",
        ip=None,
    )
    await service.set_member_statuses(
        session,
        event=event,
        household_id=household.id,
        member_ids=[member_ids[1]],
        status="needs_rescue",
        actor=admin,
        set_method="assisted",
        ip=None,
    )
    # member_ids[2] and [3] left with no row at all -> unaccounted

    summary = await service.accounted_for_summary(session, event=event, user=admin)
    area_row = next(a for a in summary.registered if a.area_id == area.id)
    assert (
        area_row.safe_confirmed + area_row.safe_bulk + area_row.needs_rescue + area_row.unaccounted
        == area_row.registered_members
    )
    assert area_row.safe_confirmed >= 1
    assert area_row.needs_rescue >= 1


async def test_unregistered_counts_never_touch_registered_totals(session, demo_users):
    from src.modules.safety.models import UnregisteredPerson

    area = await get_area(session)
    await make_household(session, area=area, member_count=2)
    event = await make_event(session)
    admin = _actor(demo_users["admin"])

    before = await service.accounted_for_summary(session, event=event, user=admin)
    before_total = before.registered_total.registered_members

    person = UnregisteredPerson(event_id=event.id, full_name="Someone at the bridge")
    session.add(person)
    await session.flush()
    await service.set_unregistered_status(
        session,
        event=event,
        unregistered_person_id=person.id,
        status="needs_rescue",
        actor=admin,
        set_method="assisted",
        ip=None,
    )

    after = await service.accounted_for_summary(session, event=event, user=admin)
    assert after.registered_total.registered_members == before_total  # unchanged
    assert after.unregistered_needs_rescue == 1
    assert after.unregistered_safe == 0


async def test_bhw_accounted_for_is_scoped_to_assigned_areas(session, demo_users):
    """BHW Demo is seeded scoped to Areas 1 and 2. A household in Area 5 must
    not appear in their accounted-for summary."""
    area5 = await get_area(session, name="Area 5")
    await make_household(session, area=area5, member_count=2)
    event = await make_event(session)
    bhw = _actor(demo_users["bhw"])

    summary = await service.accounted_for_summary(session, event=event, user=bhw)
    assert all(a.area_name != "Area 5" for a in summary.registered)


async def test_bhw_with_no_assignment_sees_zero_not_everything(session):
    """`apply_area_scope`'s own contract: an unassigned BHW sees nothing,
    never falls through to seeing every household."""
    area = await get_area(session)
    await make_household(session, area=area, member_count=2)
    event = await make_event(session)
    unassigned_bhw = AuthenticatedUser(id=uuid.uuid4(), role="bhw", assigned_area_ids=())

    summary = await service.accounted_for_summary(session, event=event, user=unassigned_bhw)
    assert summary.registered == []
    assert summary.registered_total.registered_members == 0


async def test_admin_unregistered_scope_returns_none_not_a_household(session, demo_users):
    """Distinct from the member/household scopes — there is no household to
    summarise for an unregistered person, and pretending otherwise would be
    actively wrong, not just incomplete."""
    from src.modules.safety.models import UnregisteredPerson

    event = await make_event(session)
    admin = _actor(demo_users["admin"])
    person = UnregisteredPerson(event_id=event.id, full_name="Someone at the bridge")
    session.add(person)
    await session.flush()

    result = await service.submit_admin_status(
        session,
        event=event,
        actor=admin,
        body=SafetyStatusAdminIn(
            status="safe", scope="unregistered", unregistered_person_id=person.id
        ),
        ip=None,
    )
    assert result is None
