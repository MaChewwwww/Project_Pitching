"""HTTP surface for the evacuation module (FR-EVC-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request

from src.core.deps import CurrentUser, require_role
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.evacuation import service
from src.modules.evacuation.schemas import (
    EmergencyEventDeclare,
    EmergencyEventOut,
    EvacCenterIn,
    PublicEmergencyEvent,
    PublicEvacCenter,
)

public_router = APIRouter(tags=["evacuation"])
admin_router = APIRouter(tags=["evacuation"])


@public_router.get(
    "/emergency-events/active",
    summary="The currently active emergency event, if any (FR-SAF-018)",
)
async def public_active_event(session: DbSessionDep) -> PublicEmergencyEvent | None:
    return await service.get_public_active_event(session)


@admin_router.get(
    "/emergency-events",
    dependencies=[Depends(require_role("admin", "bhw", "sk"))],
    summary="List emergency events, most recent first",
)
async def admin_list_events(
    session: DbSessionDep, page: int = 1, size: int = 20
) -> Page[EmergencyEventOut]:
    return await service.list_events(session, page=page, size=size)


@admin_router.post(
    "/emergency-events",
    dependencies=[Depends(require_role("admin"))],
    summary="Declare an emergency event (FR-SAF-018)",
)
async def admin_declare_event(
    body: EmergencyEventDeclare, request: Request, session: DbSessionDep, user: CurrentUser
) -> EmergencyEventOut:
    ip = request.client.host if request.client else None
    event = await service.declare_event(session, body=body, actor=user, ip=ip)
    return await service.event_out(session, event)


@admin_router.post(
    "/emergency-events/{event_id}/end",
    dependencies=[Depends(require_role("admin"))],
    summary="End an active emergency event (FR-SAF-019)",
)
async def admin_end_event(
    event_id: uuid.UUID, request: Request, session: DbSessionDep, user: CurrentUser
) -> EmergencyEventOut:
    ip = request.client.host if request.client else None
    event = await service.end_event(session, event_id, actor=user, ip=ip)
    return await service.event_out(session, event)


@public_router.get(
    "/evacuation-centers", summary="Evacuation centres — address, capacity, occupancy"
)
async def public_evac_centers(
    session: DbSessionDep, page: int = 1, size: int = 20
) -> Page[PublicEvacCenter]:
    return await service.list_evac_centers(session, page=page, size=size)


@admin_router.get(
    "/evacuation-centers",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="List all evacuation centres",
)
async def admin_list_evac_centers(session: DbSessionDep) -> list[PublicEvacCenter]:
    return await service.list_evac_centers_admin(session)


@admin_router.post(
    "/evacuation-centers",
    dependencies=[Depends(require_role("admin"))],
    summary="Register an evacuation centre",
)
async def admin_create_evac_center(
    body: EvacCenterIn, session: DbSessionDep, user: CurrentUser
) -> dict[str, str]:
    center = await service.create_evac_center(session, body, actor_id=user.id)
    return {"id": str(center.id)}


@admin_router.patch(
    "/evacuation-centers/{center_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update an evacuation centre",
)
async def admin_update_evac_center(
    center_id: uuid.UUID, body: EvacCenterIn, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.update_evac_center(session, center_id, body, actor_id=user.id)
    return {"ok": True}
