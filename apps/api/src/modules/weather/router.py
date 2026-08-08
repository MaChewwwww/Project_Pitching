"""HTTP surface for the weather module (FR-WX-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from src.core.deps import CurrentUser, require_role
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.weather import service
from src.modules.weather.schemas import (
    FloodEventIn,
    ManualReadingIn,
    PublicFloodEvent,
    PublicReading,
    PublicRiverLevel,
    PublicWeatherCurrent,
    SimulateTyphoonResult,
)

public_router = APIRouter(tags=["weather"])
admin_router = APIRouter(tags=["weather"])


# --- public --------------------------------------------------------------------


@public_router.get("/weather/current", summary="Current conditions and forecast")
async def public_weather_current(session: DbSessionDep) -> PublicWeatherCurrent:
    return await service.get_weather_current(session)


@public_router.get("/river-level", summary="Current river level and alert tier")
async def public_river_level(session: DbSessionDep) -> PublicRiverLevel:
    return await service.get_river_level(session)


@public_router.get("/flood-events", summary="Flood history — publicly viewable (FR-WX-013)")
async def public_flood_events(
    session: DbSessionDep, page: int = 1, size: int = 20
) -> Page[PublicFloodEvent]:
    return await service.list_flood_events(session, page=page, size=size)


# --- admin ----------------------------------------------------------------------


@admin_router.post(
    "/readings",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Enter a river/weather reading manually (FR-WX-007)",
)
async def admin_record_reading(
    body: ManualReadingIn, session: DbSessionDep, user: CurrentUser
) -> PublicReading:
    reading = await service.record_manual_reading(session, body, actor_id=user.id)
    return await service.reading_to_public(session, reading)


@admin_router.post(
    "/readings/simulate-typhoon",
    dependencies=[Depends(require_role("admin"))],
    summary="Demo tool: write a rising river-level sequence and alert prompts on demand",
)
async def admin_simulate_typhoon(session: DbSessionDep, user: CurrentUser) -> SimulateTyphoonResult:
    return await service.simulate_typhoon(session, actor_id=user.id)


@admin_router.get(
    "/flood-events", dependencies=[Depends(require_role("admin"))], summary="List all flood events"
)
async def admin_list_flood_events(session: DbSessionDep) -> Page[PublicFloodEvent]:
    return await service.list_flood_events(session, page=1, size=100)


@admin_router.post(
    "/flood-events", dependencies=[Depends(require_role("admin"))], summary="Record a flood event"
)
async def admin_create_flood_event(
    body: FloodEventIn, session: DbSessionDep, user: CurrentUser
) -> dict[str, str]:
    event = await service.create_flood_event(session, body, actor_id=user.id)
    return {"id": str(event.id)}


@admin_router.patch(
    "/flood-events/{event_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update a flood event",
)
async def admin_update_flood_event(
    event_id: uuid.UUID, body: FloodEventIn, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.update_flood_event(session, event_id, body, actor_id=user.id)
    return {"ok": True}
