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
    AdminEvacCenterIn,
    AdminEvacCenterOut,
    EmergencyEventDeclare,
    EmergencyEventDetailOut,
    EmergencyEventEnd,
    EmergencyEventOut,
    EmergencyEventPatch,
    EvacCenterIn,
    EvacCheckinCreate,
    EvacCheckinOut,
    PortalEvacuationStatusOut,
    PublicEmergencyEvent,
    PublicEvacCenter,
)

public_router = APIRouter(tags=["evacuation"])
admin_router = APIRouter(tags=["evacuation"])


@public_router.get(
    "/emergency-events/active",
    summary="Active emergency events, newest first (FR-SAF-018/020)",
)
async def public_active_event(session: DbSessionDep) -> list[PublicEmergencyEvent]:
    return await service.get_public_active_events(session)


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


@admin_router.get(
    "/emergency-events/{event_id}",
    dependencies=[Depends(require_role("admin", "bhw", "sk"))],
    summary="Get comprehensive emergency event detail and statistics",
)
async def admin_get_event(
    event_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> EmergencyEventDetailOut:
    return await service.get_event_detail(session, event_id)


@admin_router.patch(
    "/emergency-events/{event_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update an emergency event",
)
async def admin_update_event(
    event_id: uuid.UUID,
    body: EmergencyEventPatch,
    request: Request,
    session: DbSessionDep,
    user: CurrentUser,
) -> EmergencyEventDetailOut:
    ip = request.client.host if request.client else None
    return await service.update_event(session, event_id, body=body, actor=user, ip=ip)


@admin_router.delete(
    "/emergency-events/{event_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Delete an emergency event",
)
async def admin_delete_event(
    event_id: uuid.UUID, request: Request, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    ip = request.client.host if request.client else None
    await service.delete_event(session, event_id, actor=user, ip=ip)
    return {"ok": True}


@admin_router.post(
    "/emergency-events/{event_id}/end",
    dependencies=[Depends(require_role("admin"))],
    summary="End an active emergency event (FR-SAF-019)",
)
async def admin_end_event(
    event_id: uuid.UUID,
    request: Request,
    session: DbSessionDep,
    user: CurrentUser,
    body: EmergencyEventEnd | None = None,
) -> EmergencyEventOut:
    ip = request.client.host if request.client else None
    ended_at = body.ended_at if body else None
    event, reset_count = await service.end_event(
        session, event_id, actor=user, ip=ip, ended_at=ended_at
    )
    return await service.event_out(session, event, occupancy_reset_count=reset_count)


@public_router.get(
    "/evacuation-centers", summary="Evacuation centres — address, capacity, occupancy"
)
async def public_evac_centers(
    session: DbSessionDep, page: int = 1, size: int = 20
) -> Page[PublicEvacCenter]:
    return await service.list_evac_centers(session, page=page, size=size)


@admin_router.get(
    "/evacuation-centers",
    dependencies=[Depends(require_role("admin"))],
    summary="List all evacuation centres",
)
async def admin_list_evac_centers(session: DbSessionDep) -> list[AdminEvacCenterOut]:
    return await service.list_admin_evac_centers(session)


@admin_router.get(
    "/evacuation-centers/{center_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Get an evacuation center",
)
async def admin_get_evac_center(center_id: uuid.UUID, session: DbSessionDep) -> AdminEvacCenterOut:
    return await service.get_admin_evac_center(session, center_id)


@admin_router.post(
    "/evacuation-centers",
    dependencies=[Depends(require_role("admin"))],
    summary="Register an evacuation centre",
)
async def admin_create_evac_center(
    body: AdminEvacCenterIn | EvacCenterIn, session: DbSessionDep, user: CurrentUser
) -> AdminEvacCenterOut:
    if isinstance(body, AdminEvacCenterIn):
        return await service.create_admin_evac_center(session, body, actor_id=user.id)
    center = await service.create_evac_center(session, body, actor_id=user.id)
    return await service.get_admin_evac_center(session, center.id)


@admin_router.patch(
    "/evacuation-centers/{center_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Update an evacuation centre",
)
async def admin_update_evac_center(
    center_id: uuid.UUID,
    body: AdminEvacCenterIn | EvacCenterIn,
    session: DbSessionDep,
    user: CurrentUser,
) -> AdminEvacCenterOut:
    if isinstance(body, AdminEvacCenterIn):
        return await service.update_admin_evac_center(session, center_id, body, actor_id=user.id)
    await service.update_evac_center(session, center_id, body, actor_id=user.id)
    return await service.get_admin_evac_center(session, center_id)


@admin_router.delete(
    "/evacuation-centers/{center_id}",
    dependencies=[Depends(require_role("admin"))],
    summary="Deactivate an evacuation center",
)
async def admin_deactivate_evac_center(
    center_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.deactivate_evac_center(session, center_id, actor_id=user.id)
    return {"ok": True, "deactivated": True}


@admin_router.post(
    "/evacuation-centers/{center_id}/reactivate",
    dependencies=[Depends(require_role("admin"))],
    summary="Reactivate an evacuation center",
)
async def admin_reactivate_evac_center(
    center_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> AdminEvacCenterOut:
    return await service.reactivate_evac_center(session, center_id, actor_id=user.id)


@admin_router.post(
    "/evacuation-centers/check-ins",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Log a check-in at an evacuation center (FR-EVC-004)",
)
async def admin_create_checkin(
    body: EvacCheckinCreate, session: DbSessionDep, user: CurrentUser
) -> EvacCheckinOut:
    return await service.create_checkin(session, body, actor=user)


@admin_router.post(
    "/evacuation-centers/check-ins/{checkin_id}/check-out",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="Log a resident check-out from an evacuation center (FR-EVC-005)",
)
async def admin_checkout_checkin(
    checkin_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> EvacCheckinOut:
    return await service.checkout_checkin(session, checkin_id, actor=user)


@admin_router.get(
    "/evacuation-centers/{center_id}/check-ins",
    dependencies=[Depends(require_role("admin", "bhw"))],
    summary="List check-ins for an evacuation center",
)
async def admin_list_center_checkins(
    center_id: uuid.UUID,
    session: DbSessionDep,
    event_id: uuid.UUID | None = None,
    active_only: bool = False,
) -> list[EvacCheckinOut]:
    return await service.list_checkins_for_center(
        session, center_id, event_id=event_id, active_only=active_only
    )


@admin_router.get(
    "/portal/evacuation-status",
    dependencies=[Depends(require_role("head", "admin", "bhw", "sk"))],
    summary="Get citizen active evacuation status and history",
)
async def portal_evacuation_status(
    session: DbSessionDep, user: CurrentUser
) -> PortalEvacuationStatusOut:
    return await service.get_portal_evacuation_status(session, user)
