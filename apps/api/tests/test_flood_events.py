"""FR-WX-013 flood-history CRUD and emergency lifecycle protection."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from factories import get_area, make_event

from src.core.deps import AuthenticatedUser
from src.modules.weather import service
from src.modules.weather.schemas import FloodEventIn


def _actor(user) -> AuthenticatedUser:
    return AuthenticatedUser(id=user.id, role=user.role)


def _payload(*, area_ids: list[uuid.UUID]) -> FloodEventIn:
    started_at = datetime(2020, 11, 11, tzinfo=UTC)
    return FloodEventIn(
        name="Test flood history",
        started_at=started_at,
        ended_at=started_at + timedelta(days=2),
        peak_level_m=20.7,
        peak_at=started_at + timedelta(hours=6),
        households_displaced=42,
        notes="Recorded for test coverage.",
        area_ids=area_ids,
    )


async def test_admin_history_preserves_area_ids_and_replaces_them_on_update(session, demo_users):
    actor = _actor(demo_users["admin"])
    area_one = await get_area(session, name="Area 1")
    area_two = await get_area(session, name="Area 2")
    event = await service.create_flood_event(
        session, _payload(area_ids=[area_one.id]), actor_id=actor.id
    )

    before = await service.list_admin_flood_events(session)
    before_event = next(item for item in before.items if item.id == event.id)
    assert before_event.area_ids == [area_one.id]
    assert before_event.area_names == ["Area 1"]

    await service.update_flood_event(
        session,
        event.id,
        _payload(area_ids=[area_two.id]),
        actor_id=actor.id,
    )
    after = await service.list_admin_flood_events(session)
    after_event = next(item for item in after.items if item.id == event.id)
    assert after_event.area_ids == [area_two.id]
    assert after_event.area_names == ["Area 2"]


async def test_manual_flood_event_can_be_deleted_and_disappears_from_public_history(
    session, demo_users, admin_client, client
):
    actor = _actor(demo_users["admin"])
    area = await get_area(session, name="Area 1")
    event = await service.create_flood_event(
        session, _payload(area_ids=[area.id]), actor_id=actor.id
    )

    deleted = await admin_client.delete(f"/api/v1/admin/flood-events/{event.id}")
    assert deleted.status_code == 200

    public_history = await client.get("/api/v1/public/flood-events")
    assert public_history.status_code == 200
    assert all(item["id"] != str(event.id) for item in public_history.json()["items"])
    assert all("area_ids" not in item for item in public_history.json()["items"])


async def test_auto_synced_flood_event_cannot_be_deleted(session, demo_users, admin_client):
    actor = _actor(demo_users["admin"])
    emergency_event = await make_event(session)
    event = await service.create_flood_event(
        session,
        FloodEventIn(
            name="Auto-synced flood",
            emergency_event_id=emergency_event.id,
            started_at=datetime.now(UTC),
        ),
        actor_id=actor.id,
    )

    response = await admin_client.delete(f"/api/v1/admin/flood-events/{event.id}")
    assert response.status_code == 409
    assert "cannot be deleted" in response.json()["detail"]


async def test_delete_requires_admin_and_reports_missing_records(admin_client, bhw_client, client):
    event_id = uuid.uuid4()
    assert (await client.delete(f"/api/v1/admin/flood-events/{event_id}")).status_code == 401
    assert (await bhw_client.delete(f"/api/v1/admin/flood-events/{event_id}")).status_code == 403
    assert (await admin_client.delete(f"/api/v1/admin/flood-events/{event_id}")).status_code == 404
