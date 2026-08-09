"""FR-SAF-012/013 — recording an unregistered person as safe or needing
rescue, in one action, without touching the registered coverage figures.
"""

from __future__ import annotations

import pytest
from factories import get_area, make_event, make_household
from pydantic import ValidationError
from sqlalchemy import select

from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError
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


async def test_missing_location_and_note_is_rejected():
    with pytest.raises(ValidationError):
        UnregisteredPersonIn(full_name="No location given", initial_status="safe")


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
