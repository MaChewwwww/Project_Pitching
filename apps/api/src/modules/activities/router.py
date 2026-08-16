"""HTTP routes for activity article publishing."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile

from src.core.deps import CurrentUser, require_role
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.activities import service
from src.modules.activities.schemas import ActivityDetail, ActivityIn, ActivityType, PublicActivity
from src.modules.alerts.schemas import ArticleImageOut, ArticleImagePatch, ImageOrderIn

public_router = APIRouter(tags=["activities"])
admin_router = APIRouter(tags=["activities"])


@public_router.get("/activities", summary="Published upcoming activities")
async def public_activities(
    session: DbSessionDep,
    page: int = 1,
    size: int = 20,
    upcoming: bool = True,
    activity_type: Annotated[ActivityType | None, Query(alias="type")] = None,
) -> Page[PublicActivity]:
    return await service.list_activities(
        session, page=page, size=size, upcoming=upcoming, activity_type=activity_type
    )


@public_router.get("/activities/{slug}", summary="Published activity article")
async def public_activity_detail(slug: str, session: DbSessionDep) -> ActivityDetail:
    return await service.get_activity_by_slug(session, slug)


@admin_router.get("/activities", dependencies=[Depends(require_role("admin", "sk"))])
async def admin_list_activities(session: DbSessionDep) -> list[PublicActivity]:
    return await service.list_activities_admin(session)


@admin_router.post("/activities", dependencies=[Depends(require_role("admin", "sk"))])
async def admin_create_activity(
    body: ActivityIn, session: DbSessionDep, user: CurrentUser
) -> PublicActivity:
    activity = await service.create_activity(session, body, actor_id=user.id)
    return next(
        item for item in await service.list_activities_admin(session) if item.id == activity.id
    )


@admin_router.get("/activities/{activity_id}", dependencies=[Depends(require_role("admin", "sk"))])
async def admin_activity_detail(activity_id: uuid.UUID, session: DbSessionDep) -> ActivityDetail:
    return await service.get_activity(session, activity_id, public=False)


@admin_router.patch(
    "/activities/{activity_id}", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_update_activity(
    activity_id: uuid.UUID, body: ActivityIn, session: DbSessionDep, user: CurrentUser
) -> PublicActivity:
    activity = await service.update_activity(session, activity_id, body, actor_id=user.id)
    return next(
        item for item in await service.list_activities_admin(session) if item.id == activity.id
    )


@admin_router.delete(
    "/activities/{activity_id}", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_delete_activity(
    activity_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_activity(session, activity_id, actor_id=user.id)
    return {"ok": True}


@admin_router.post(
    "/activities/{activity_id}/images", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_add_activity_image(
    activity_id: uuid.UUID,
    session: DbSessionDep,
    user: CurrentUser,
    file: UploadFile = File(...),  # noqa: B008
) -> ArticleImageOut:
    return await service.add_image(session, activity_id, file, actor_id=user.id)


@admin_router.patch(
    "/activities/{activity_id}/images/{image_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
)
async def admin_patch_activity_image(
    activity_id: uuid.UUID,
    image_id: uuid.UUID,
    body: ArticleImagePatch,
    session: DbSessionDep,
    user: CurrentUser,
) -> ArticleImageOut:
    return await service.patch_image(session, activity_id, image_id, body, actor_id=user.id)


@admin_router.put(
    "/activities/{activity_id}/images/order", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_order_activity_images(
    activity_id: uuid.UUID, body: ImageOrderIn, session: DbSessionDep, user: CurrentUser
) -> list[ArticleImageOut]:
    return await service.order_images(session, activity_id, body, actor_id=user.id)


@admin_router.delete(
    "/activities/{activity_id}/images/{image_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
)
async def admin_delete_activity_image(
    activity_id: uuid.UUID, image_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_image(session, activity_id, image_id, actor_id=user.id)
    return {"ok": True}
