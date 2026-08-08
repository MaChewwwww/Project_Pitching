"""HTTP surface for the activities module (FR-ACT-*).

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
from src.modules.activities import service
from src.modules.activities.schemas import ActivityIn, PublicActivity

public_router = APIRouter(tags=["activities"])
admin_router = APIRouter(tags=["activities"])


@public_router.get("/activities", summary="Upcoming activities")
async def public_activities(
    session: DbSessionDep, page: int = 1, size: int = 20, upcoming: bool = True
) -> Page[PublicActivity]:
    return await service.list_activities(session, page=page, size=size, upcoming=upcoming)


@admin_router.get(
    "/activities",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="List all activities",
)
async def admin_list_activities(session: DbSessionDep) -> list[PublicActivity]:
    return await service.list_activities_admin(session)


@admin_router.post(
    "/activities", dependencies=[Depends(require_role("admin", "sk"))], summary="Create an activity"
)
async def admin_create_activity(
    body: ActivityIn, session: DbSessionDep, user: CurrentUser
) -> PublicActivity:
    activity = await service.create_activity(session, body, actor_id=user.id)
    return await _refetch(session, activity.id)


async def _refetch(session: DbSessionDep, activity_id: uuid.UUID) -> PublicActivity:
    items = await service.list_activities_admin(session)
    return next(i for i in items if i.id == activity_id)


@admin_router.patch(
    "/activities/{activity_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="Update an activity",
)
async def admin_update_activity(
    activity_id: uuid.UUID, body: ActivityIn, session: DbSessionDep, user: CurrentUser
) -> PublicActivity:
    await service.update_activity(session, activity_id, body, actor_id=user.id)
    return await _refetch(session, activity_id)


@admin_router.delete(
    "/activities/{activity_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="Remove an activity",
)
async def admin_delete_activity(
    activity_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_activity(session, activity_id, actor_id=user.id)
    return {"ok": True}
