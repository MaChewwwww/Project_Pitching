"""FR-SAF-008/009/017 — the public rescue-request endpoint.

The first unauthenticated write in this codebase. Per architecture.md's spec:
no database read on the request path, generous rate limiting (a false
positive turns away a real emergency), and a response that never implies a
rescue is guaranteed.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from src.core.rate_limit import limiter
from src.modules.safety.models import RescueRequest
from src.modules.users.models import AuditLog


@pytest.fixture(autouse=True)
def _reset_shared_rate_limit_storage():
    """`limiter` is one module-level object shared by the whole app, so its
    in-memory quota persists across every test in this file (they all hit the
    same route from the same test-client IP). Reset before each test so the
    quota-tripping test gets a clean window instead of inheriting whatever
    the tests before it already spent."""
    limiter.reset()
    yield


async def test_unauthenticated_request_succeeds(client):
    response = await client.post(
        "/api/v1/public/rescue-requests",
        json={
            "requester_name": "Maria Santos",
            "contact_number": "09171234567",
            "latitude": 14.735,
            "longitude": 121.135,
            "description": "Water is rising fast, we're on the second floor.",
            "people_count": 4,
        },
    )
    assert response.status_code == 201


async def test_ack_carries_only_id_and_received_at(client):
    """No `status` field — FR-SAF-017 forbids anything reading as
    "queued for rescue"."""
    response = await client.post(
        "/api/v1/public/rescue-requests",
        json={
            "requester_name": "Juan Dela Cruz",
            "location_note": "Near the Wawa bridge",
            "description": "Stranded, water at chest level.",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert set(body.keys()) == {"id", "received_at"}


async def test_neither_pin_nor_note_is_rejected(client):
    response = await client.post(
        "/api/v1/public/rescue-requests",
        json={"requester_name": "Anonymous", "description": "Need help."},
    )
    assert response.status_code == 422
    body = response.json()
    assert any("pin" in e["message"] or "describe" in e["message"] for e in body["errors"])


async def test_source_ip_persisted_but_never_in_the_response(client, session):
    response = await client.post(
        "/api/v1/public/rescue-requests",
        json={
            "requester_name": "Pedro Reyes",
            "location_note": "Purok 2",
            "description": "Roof is leaking badly, elderly parent inside.",
        },
    )
    assert response.status_code == 201
    assert "source_ip" not in response.json()

    row_id = uuid.UUID(response.json()["id"])
    row = await session.get(RescueRequest, row_id)
    assert row is not None
    assert row.event_id is None  # no DB read on the request path to resolve one
    assert row.household_id is None
    assert row.priority is None
    assert row.status == "pending"


async def test_audit_row_has_a_null_actor(client, session):
    response = await client.post(
        "/api/v1/public/rescue-requests",
        json={
            "requester_name": "Ana Cruz",
            "location_note": "Beside the covered court",
            "description": "Trapped, cannot reach the road.",
        },
    )
    row_id = uuid.UUID(response.json()["id"])

    audit_row = (
        await session.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "rescue_request", AuditLog.entity_id == row_id
            )
        )
    ).scalar_one()
    assert audit_row.actor_user_id is None
    assert audit_row.action == "rescue_request.create"


async def test_generous_rate_limit_still_trips_on_abuse(client):
    """60/minute — generous by design (architecture.md R-11), but not
    unlimited. The 61st request in a minute from the same key gets 429."""
    payload = {
        "requester_name": "Load Test",
        "location_note": "Test",
        "description": "Rate limit probe.",
    }
    responses = [
        await client.post("/api/v1/public/rescue-requests", json=payload) for _ in range(61)
    ]
    assert responses[-1].status_code == 429
    assert all(r.status_code == 201 for r in responses[:60])
