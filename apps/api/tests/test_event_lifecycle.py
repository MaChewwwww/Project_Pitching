"""FR-SAF-018 (declare) / FR-SAF-019 (end) — the EmergencyEvent lifecycle.

This is the prerequisite every SAF surface depends on: `safety_status.event_id`
and `unregistered_person.event_id` are `NOT NULL`, so nothing in the safety
module can write anything until an event can be declared and ended. There was
no FR for this until this pass — see `docs/frs_nfrs.md` Section 9 and the
Aug 2026 changelog entry.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from src.core.deps import AuthenticatedUser
from src.core.errors import ConflictError, NotFoundError
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


async def test_declare_while_one_is_active_conflicts(session, demo_users):
    admin = _actor(demo_users["admin"])
    await service.declare_event(
        session, body=EmergencyEventDeclare(name="First", type="flood"), actor=admin, ip=None
    )
    with pytest.raises(ConflictError):
        await service.declare_event(
            session, body=EmergencyEventDeclare(name="Second", type="flood"), actor=admin, ip=None
        )


async def test_supersede_active_closes_the_previous_event(session, demo_users):
    admin = _actor(demo_users["admin"])
    first = await service.declare_event(
        session, body=EmergencyEventDeclare(name="First", type="flood"), actor=admin, ip=None
    )
    second = await service.declare_event(
        session,
        body=EmergencyEventDeclare(name="Second", type="typhoon", supersede_active=True),
        actor=admin,
        ip=None,
    )

    await session.refresh(first)
    assert first.is_active is False
    assert first.ended_at is not None
    assert second.is_active is True

    # Exactly one active row across the whole table, not just among these two.
    active_rows = (
        (await session.execute(select(EmergencyEvent).where(EmergencyEvent.is_active.is_(True))))
        .scalars()
        .all()
    )
    assert [row.id for row in active_rows] == [second.id]


async def test_end_event_then_end_again_conflicts(session, demo_users):
    admin = _actor(demo_users["admin"])
    event = await service.declare_event(
        session, body=EmergencyEventDeclare(name="Test", type="fire"), actor=admin, ip=None
    )
    ended = await service.end_event(session, event.id, actor=admin, ip=None)
    assert ended.is_active is False
    assert ended.ended_at is not None

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


async def test_public_active_event_endpoint_is_null_with_no_active_event(client):
    response = await client.get("/api/v1/public/emergency-events/active")
    assert response.status_code == 200
    assert response.json() is None


async def test_public_active_event_endpoint_reflects_a_declared_event(client, session, demo_users):
    admin = _actor(demo_users["admin"])
    await service.declare_event(
        session, body=EmergencyEventDeclare(name="Test Flood", type="flood"), actor=admin, ip=None
    )
    response = await client.get("/api/v1/public/emergency-events/active")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Test Flood"
    assert "declared_by_user_id" not in body  # PublicEmergencyEvent carries no officer identity


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
