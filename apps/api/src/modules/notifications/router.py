from __future__ import annotations

import uuid

from fastapi import APIRouter

from src.core.deps import CurrentUser
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.notifications import service
from src.modules.notifications.schemas import NotificationOut

me_router = APIRouter(tags=["notifications"])


@me_router.get("/notifications")
async def me_notifications(
    session: DbSessionDep,
    user: CurrentUser,
    page: int = 1,
    size: int = 20,
    unread_only: bool = False,
) -> Page[NotificationOut]:
    return await service.list_notifications(
        session, user_id=user.id, page=page, size=size, unread_only=unread_only
    )


@me_router.get("/notifications/unread-count")
async def me_notification_count(session: DbSessionDep, user: CurrentUser) -> dict[str, int]:
    return {"count": await service.unread_count(session, user_id=user.id)}


@me_router.patch("/notifications/{notification_id}/read")
async def me_mark_notification_read(
    notification_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> NotificationOut:
    return await service.mark_read(session, notification_id=notification_id, user_id=user.id)


@me_router.post("/notifications/read-all")
async def me_mark_all_notifications_read(
    session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.mark_all_read(session, user_id=user.id)
    return {"ok": True}
