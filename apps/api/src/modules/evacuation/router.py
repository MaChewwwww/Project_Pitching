"""HTTP surface for the evacuation module (FR-EVC-*).

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
from src.modules.evacuation import service
from src.modules.evacuation.schemas import EvacCenterIn, PublicEvacCenter

public_router = APIRouter(tags=["evacuation"])
admin_router = APIRouter(tags=["evacuation"])


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
