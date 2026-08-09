"""FR-SAF-010 — rescue queue, triage, and the household-matching service
function. `test_triage.py` covers the pure priority math; this covers the
database-touching parts: household matching, lazy triage, and the admin
queue endpoints.
"""

from __future__ import annotations

import random

from factories import get_area, make_household
from sqlalchemy import select

from src.core.deps import AuthenticatedUser
from src.modules.registry.models import Member
from src.modules.safety import service
from src.modules.safety.models import RescueRequest
from src.modules.safety.schemas import RescueRequestPatch


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


def _unique_local_number() -> str:
    """A 10-digit `09XXXXXXXXX` number, random per call. The seeded database
    has ~200 households with real-looking contact numbers, so a fixed
    literal like "09171234567" risks colliding with seed data and making an
    exact-match test non-deterministic — the same reason `factories.py`'s
    own `make_household` randomises `reference_no`."""
    return "09" + "".join(str(random.randint(0, 9)) for _ in range(9))


async def test_match_household_attaches_on_a_single_exact_match(session):
    area = await get_area(session)
    number = _unique_local_number()
    await make_household(session, area=area, contact_number=number)

    matched = await service._match_household(session, number)
    assert matched is not None

    prefixed = "+63" + number[1:]
    matched_prefixed = await service._match_household(session, prefixed)
    assert matched_prefixed is not None
    assert matched_prefixed.id == matched.id


async def test_match_household_returns_none_on_two_matches(session):
    area = await get_area(session)
    number = _unique_local_number()
    await make_household(session, area=area, contact_number=number)
    await make_household(session, area=area, contact_number=number)

    matched = await service._match_household(session, number)
    assert matched is None


async def test_match_household_returns_none_when_nothing_matches(session):
    area = await get_area(session)
    await make_household(session, area=area, contact_number="09171234567")

    assert await service._match_household(session, "09990000000") is None
    assert await service._match_household(session, None) is None


async def test_lazy_triage_is_idempotent_and_matches_the_household(session):
    area = await get_area(session)
    household = await make_household(
        session, area=area, contact_number="09181112222", member_count=1
    )
    member = (
        await session.execute(select(Member).where(Member.household_id == household.id))
    ).scalar_one()
    member.is_bedridden = True
    await session.flush()

    row = RescueRequest(
        requester_name="Test Requester",
        contact_number="09181112222",
        description="Testing lazy triage",
    )
    session.add(row)
    await session.flush()
    assert row.priority is None

    await service._ensure_triaged(session, [row])
    assert row.priority is not None
    assert row.household_id == household.id
    first_priority = row.priority

    # A second pass over an already-triaged row must not recompute it —
    # `_ensure_triaged` filters on `priority is None`, so calling it again
    # directly with the same (now-triaged) row is a no-op by construction.
    await service._ensure_triaged(session, [row])
    assert row.priority == first_priority


async def test_unregistered_rescue_request_is_never_lower_priority_than_a_no_flag_household(
    session,
):
    area = await get_area(session)
    await make_household(session, area=area, contact_number="09201234567")

    anonymous = RescueRequest(requester_name="Anonymous", description="No contact number given")
    registered_no_flags = RescueRequest(
        requester_name="Registered, No Flags",
        contact_number="09201234567",
        description="Matches a household with no vulnerability flags",
    )
    session.add_all([anonymous, registered_no_flags])
    await session.flush()

    await service._ensure_triaged(session, [anonymous, registered_no_flags])
    assert anonymous.priority == registered_no_flags.priority


async def test_resolving_without_a_note_is_rejected(admin_client, session):
    row = RescueRequest(requester_name="Test", description="Test")
    session.add(row)
    await session.flush()
    await session.commit()

    response = await admin_client.patch(
        f"/api/v1/admin/rescue-requests/{row.id}", json={"status": "resolved"}
    )
    assert response.status_code == 422


async def test_invalid_transition_is_rejected(admin_client, session):
    row = RescueRequest(requester_name="Test", description="Test", status="resolved")
    session.add(row)
    await session.flush()
    await session.commit()

    response = await admin_client.patch(
        f"/api/v1/admin/rescue-requests/{row.id}",
        json={"status": "dispatched", "resolution_note": "n/a"},
    )
    assert response.status_code == 409


async def test_valid_transition_with_a_note_succeeds(admin_client, session):
    row = RescueRequest(requester_name="Test", description="Test", status="pending")
    session.add(row)
    await session.flush()
    await session.commit()

    response = await admin_client.patch(
        f"/api/v1/admin/rescue-requests/{row.id}",
        json={"status": "verified"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "verified"


async def test_manual_priority_override_is_not_recomputed_on_next_triage(session, demo_users):
    row = RescueRequest(requester_name="Test", description="Test")
    session.add(row)
    await session.flush()

    admin = _actor(demo_users["admin"])
    await service.update_rescue_request(
        session,
        row.id,
        body=RescueRequestPatch(priority=5),
        actor=admin,
        ip=None,
    )
    await session.refresh(row)
    assert row.priority == 5
    assert row.priority_is_manual is True

    # A row with a non-null priority is excluded from `_ensure_triaged`'s
    # untriaged set by construction, so the manual value survives.
    await service._ensure_triaged(session, [row])
    assert row.priority == 5


async def test_bhw_sees_unregistered_rescue_requests_queue_is_not_area_scoped(
    bhw_client, session
):
    """`rescue_request` has no `area_id` — the queue must not be scoped,
    or a BHW would never see the anonymous requests BR-5.9 exists to
    protect."""
    row = RescueRequest(requester_name="Anonymous", description="No household to scope by")
    session.add(row)
    await session.flush()
    await session.commit()

    response = await bhw_client.get("/api/v1/admin/rescue-requests")
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["items"]}
    assert str(row.id) in ids
