"""FR-SAF-018 (declare) / FR-SAF-019 (end) — the EmergencyEvent lifecycle.

This is the prerequisite every SAF surface depends on: `safety_status.event_id`
and `unregistered_person.event_id` are `NOT NULL`, so nothing in the safety
module can write anything until an event can be declared and ended. There was
no FR for this until this pass — see `docs/frs_nfrs.md` Section 9 and the
Aug 2026 changelog entry.
"""

from __future__ import annotations

import pytest
from factories import get_area, make_household
from sqlalchemy import select

from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError, NotFoundError
from src.core.security import create_access_token
from src.modules.evacuation import service
from src.modules.evacuation.models import EmergencyEvent
from src.modules.evacuation.schemas import EmergencyEventDeclare


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


async def test_declare_creates_one_active_event(session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session, body=EmergencyEventDeclare(name="Test Flood", type="flood"), actor=admin, ip=None
    )
    assert event.is_active is True

    active = await service.get_active_event(session)
    assert active is not None
    assert active.id == event.id


async def test_concurrent_declarations_remain_active(session, demo_users):
    admin = _actor(demo_users["admin"])
    first = await service.declare_event(
        session, body=EmergencyEventDeclare(name="First", type="flood"), actor=admin, ip=None
    )
    second = await service.declare_event(
        session, body=EmergencyEventDeclare(name="Second", type="fire"), actor=admin, ip=None
    )
    active_rows = (
        (await session.execute(select(EmergencyEvent).where(EmergencyEvent.is_active.is_(True))))
        .scalars()
        .all()
    )
    assert {row.id for row in active_rows} == {first.id, second.id}
    assert len(active_rows) == 2
    public_rows = await service.get_public_active_events(session)
    assert [row.id for row in public_rows] == [second.id, first.id]


async def test_omitted_event_is_ambiguous_when_two_are_active(session, demo_users):
    admin = _actor(demo_users["admin"])
    first = await service.declare_event(
        session, body=EmergencyEventDeclare(name="First", type="flood"), actor=admin, ip=None
    )
    await service.declare_event(
        session, body=EmergencyEventDeclare(name="Second", type="fire"), actor=admin, ip=None
    )
    with pytest.raises(ConflictError):
        await service.require_active_event(session)
    assert (await service.require_active_event(session, first.id)).id == first.id


async def test_end_event_then_end_again_conflicts(session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session, body=EmergencyEventDeclare(name="Test", type="fire"), actor=admin, ip=None
    )
    ended, reset_count = await service.end_event(session, event.id, actor=admin, ip=None)
    assert ended.is_active is False
    assert ended.ended_at is not None
    assert reset_count == 0

    with pytest.raises(ConflictError):
        await service.require_active_event(session, event.id)
    with pytest.raises(ConflictError):
        await service.end_event(session, event.id, actor=admin, ip=None)


async def test_end_unknown_event_404s(session, demo_users):
    import uuid

    admin = _actor(demo_users["admin"])
    with pytest.raises(NotFoundError):
        await service.end_event(session, uuid.uuid4(), actor=admin, ip=None)


async def test_require_active_event_raises_when_none(session):
    with pytest.raises(ConflictError):
        await service.require_active_event(session)


async def test_require_active_event_returns_the_active_row(session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session, body=EmergencyEventDeclare(name="Test", type="flood"), actor=admin, ip=None
    )
    required = await service.require_active_event(session)
    assert required.id == event.id


async def test_public_active_event_endpoint_is_empty_with_no_active_event(client):
    response = await client.get("/api/v1/public/emergency-events/active")
    assert response.status_code == 200
    assert response.json() == []


async def test_public_active_event_endpoint_reflects_a_declared_event(client, session, demo_users):
    admin = _actor(demo_users["admin"])
    await service.declare_event(
        session, body=EmergencyEventDeclare(name="Test Flood", type="flood"), actor=admin, ip=None
    )
    response = await client.get("/api/v1/public/emergency-events/active")
    assert response.status_code == 200
    body = response.json()
    assert body[0]["name"] == "Test Flood"
    assert "id" in body[0]
    assert "declared_by_user_id" not in body[0]


async def test_workspace_authorization_and_bhw_area_scope(client, session, demo_users):
    area5 = await get_area(session, name="Area 5")
    hidden_household = await make_household(session, area=area5)
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session,
        body=EmergencyEventDeclare(name="Scoped response", type="fire"),
        actor=admin,
        ip=None,
    )
    await session.commit()
    path = f"/api/v1/admin/emergency-events/{event.id}/workspace"

    def auth(role: str) -> dict[str, str]:
        user = demo_users[role]
        token = create_access_token(subject=user.id, role=role)
        return {"Authorization": f"Bearer {token}"}

    admin_response = await client.get(path, headers=auth("admin"))
    assert admin_response.status_code == 200
    assert str(hidden_household.id) in {
        row["household_id"] for row in admin_response.json()["households"]
    }

    bhw_response = await client.get(path, headers=auth("bhw"))
    assert bhw_response.status_code == 200
    assert str(hidden_household.id) not in {
        row["household_id"] for row in bhw_response.json()["households"]
    }

    assert (await client.get(path, headers=auth("sk"))).status_code == 403
    assert (await client.get(path, headers=auth("head"))).status_code == 403
    assert (await client.get(path)).status_code == 401

    aggregate = await client.get(
        "/api/v1/admin/accounted-for",
        params={"event_id": str(event.id)},
        headers=auth("sk"),
    )
    assert aggregate.status_code == 200
    assert "households" not in aggregate.json()


async def test_declare_requires_admin_role(bhw_client):
    response = await bhw_client.post(
        "/api/v1/admin/emergency-events", json={"name": "Test", "type": "flood"}
    )
    assert response.status_code == 403


async def test_declare_rejects_unauthenticated(client):
    response = await client.post(
        "/api/v1/admin/emergency-events", json={"name": "Test", "type": "flood"}
    )
    assert response.status_code == 401


async def test_get_event_detail_and_stats(admin_client, session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session,
        body=EmergencyEventDeclare(name="Detail Test Event", type="flood"),
        actor=admin,
        ip=None,
    )
    await session.commit()

    response = await admin_client.get(f"/api/v1/admin/emergency-events/{event.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(event.id)
    assert data["name"] == "Detail Test Event"
    assert "stats" in data
    assert data["stats"]["total_checkins_count"] == 0
    assert data["stats"]["total_evacuees_count"] == 0


async def test_patch_event_updates_metadata_and_status(admin_client, session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session,
        body=EmergencyEventDeclare(name="Initial Name", type="flood"),
        actor=admin,
        ip=None,
    )
    await session.commit()

    response = await admin_client.patch(
        f"/api/v1/admin/emergency-events/{event.id}",
        json={"name": "Updated Typhoon Name", "type": "typhoon", "is_active": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Typhoon Name"
    assert data["type"] == "typhoon"
    assert data["is_active"] is False


async def test_delete_event_removes_record(admin_client, session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session,
        body=EmergencyEventDeclare(name="To Delete", type="fire"),
        actor=admin,
        ip=None,
    )
    await session.commit()

    response = await admin_client.delete(f"/api/v1/admin/emergency-events/{event.id}")
    assert response.status_code == 204

    # Verify event is deleted
    get_res = await admin_client.get(f"/api/v1/admin/emergency-events/{event.id}")
    assert get_res.status_code == 404

