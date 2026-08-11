"""Activity article services (FR-ACT-001…012)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.config import settings
from src.core.errors import ConflictError, NotFoundError
from src.core.pagination import Page, page_meta
from src.core.uploads import save_upload
from src.domain.article_document import slug_base
from src.modules.activities.models import Activity, ActivityImage
from src.modules.activities.schemas import ActivityDetail, ActivityIn, PublicActivity
from src.modules.alerts.schemas import ArticleImageOut, ArticleImagePatch, ImageOrderIn
from src.modules.geo.models import Area


def _image_out(image: ActivityImage) -> ArticleImageOut:
    return ArticleImageOut(
        id=image.id,
        url=f"/uploads/{image.file_path}",
        alt_text=image.alt_text,
        caption=image.caption,
        sort_order=image.sort_order,
        is_cover=image.is_cover,
    )


async def _images(session: AsyncSession, activity_id: uuid.UUID) -> list[ActivityImage]:
    return (
        (
            await session.execute(
                select(ActivityImage)
                .where(ActivityImage.activity_id == activity_id)
                .order_by(ActivityImage.sort_order)
            )
        )
        .scalars()
        .all()
    )


async def _unique_slug(
    session: AsyncSession, title: str, *, exclude_id: uuid.UUID | None = None
) -> str:
    base, candidate, number = slug_base(title), slug_base(title), 2
    while True:
        stmt = select(Activity.id).where(Activity.slug == candidate)
        if exclude_id:
            stmt = stmt.where(Activity.id != exclude_id)
        if (await session.execute(stmt)).scalar_one_or_none() is None:
            return candidate
        candidate, number = f"{base}-{number}", number + 1


def _ensure_publishable(images: list[ActivityImage]) -> None:
    if len(images) > 10:
        raise ConflictError("An article may contain at most ten images.")
    if len([image for image in images if image.is_cover]) != 1:
        raise ConflictError("A published activity needs exactly one cover image.")
    if any(not image.alt_text.strip() for image in images):
        raise ConflictError("Add meaningful alt text to every image before publishing.")


async def _to_public(
    session: AsyncSession, activity: Activity, area_name: str | None, *, now: datetime
) -> PublicActivity:
    images = await _images(session, activity.id)
    cover = next((image for image in images if image.is_cover), None)
    return PublicActivity(
        id=activity.id,
        slug=activity.slug,
        title=activity.title,
        excerpt=activity.excerpt,
        type=activity.type,
        starts_at=activity.starts_at,
        ends_at=activity.ends_at,
        venue=activity.venue,
        area_id=activity.area_id,
        area_name=area_name,
        published_at=activity.published_at,
        archived_at=activity.archived_at,
        is_upcoming=activity.starts_at > now,
        cover_image=_image_out(cover) if cover else None,
    )


async def list_activities(
    session: AsyncSession,
    *,
    page: int = 1,
    size: int = 20,
    upcoming: bool = True,
    published_only: bool = True,
) -> Page[PublicActivity]:
    now = datetime.now(UTC)
    stmt = select(Activity, Area.name).outerjoin(Area, Activity.area_id == Area.id)
    if published_only:
        stmt = stmt.where(Activity.publication_status == "published")
    if upcoming:
        stmt = stmt.where(Activity.starts_at > now)
    rows = (await session.execute(stmt.order_by(Activity.starts_at))).all()
    paged = rows[(page - 1) * size : page * size]
    return Page[PublicActivity](
        items=[
            await _to_public(session, activity, area_name, now=now) for activity, area_name in paged
        ],
        **page_meta(len(rows), page, size),
    )


async def list_activities_admin(session: AsyncSession) -> list[PublicActivity]:
    now = datetime.now(UTC)
    rows = (
        await session.execute(
            select(Activity, Area.name)
            .outerjoin(Area, Activity.area_id == Area.id)
            .order_by(Activity.starts_at)
        )
    ).all()
    return [await _to_public(session, activity, area_name, now=now) for activity, area_name in rows]


async def get_activity(
    session: AsyncSession, activity_id: uuid.UUID, *, public: bool
) -> ActivityDetail:
    stmt = (
        select(Activity, Area.name)
        .outerjoin(Area, Activity.area_id == Area.id)
        .where(Activity.id == activity_id)
    )
    if public:
        stmt = stmt.where(Activity.publication_status.in_(("published", "archived")))
    row = (await session.execute(stmt)).one_or_none()
    if row is None:
        raise NotFoundError("Activity not found.")
    activity, area_name = row
    preview = await _to_public(session, activity, area_name, now=datetime.now(UTC))
    return ActivityDetail(
        **preview.model_dump(),
        body_json=activity.body_json,
        images=[_image_out(image) for image in await _images(session, activity.id)],
    )


async def get_activity_by_slug(session: AsyncSession, slug: str) -> ActivityDetail:
    row = (
        await session.execute(
            select(Activity, Area.name)
            .outerjoin(Area, Activity.area_id == Area.id)
            .where(
                Activity.slug == slug, Activity.publication_status.in_(("published", "archived"))
            )
        )
    ).one_or_none()
    if row is None:
        raise NotFoundError("Activity not found.")
    activity, area_name = row
    preview = await _to_public(session, activity, area_name, now=datetime.now(UTC))
    return ActivityDetail(
        **preview.model_dump(),
        body_json=activity.body_json,
        images=[_image_out(image) for image in await _images(session, activity.id)],
    )


async def create_activity(
    session: AsyncSession, data: ActivityIn, *, actor_id: uuid.UUID
) -> Activity:
    now = datetime.now(UTC)
    activity = Activity(
        **data.model_dump(exclude={"publication_status"}),
        slug=await _unique_slug(session, data.title),
        publication_status=data.publication_status,
        published_at=now if data.publication_status == "published" else None,
        archived_at=now if data.publication_status == "archived" else None,
        created_by_user_id=actor_id,
    )
    if data.publication_status == "published":
        _ensure_publishable([])
    session.add(activity)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=f"activity.{data.publication_status}",
        entity_type="activity",
        entity_id=activity.id,
    )
    await session.commit()
    return activity


async def update_activity(
    session: AsyncSession, activity_id: uuid.UUID, data: ActivityIn, *, actor_id: uuid.UUID
) -> Activity:
    activity = await session.get(Activity, activity_id)
    if activity is None:
        raise NotFoundError("Activity not found.")
    for key, value in data.model_dump(exclude={"publication_status"}).items():
        setattr(activity, key, value)
    if activity.slug != slug_base(data.title):
        activity.slug = await _unique_slug(session, data.title, exclude_id=activity.id)
    now = datetime.now(UTC)
    if data.publication_status == "published":
        _ensure_publishable(await _images(session, activity.id))
        activity.published_at, activity.archived_at = activity.published_at or now, None
    elif data.publication_status == "archived":
        activity.archived_at = now
    activity.publication_status = data.publication_status
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=f"activity.{data.publication_status}",
        entity_type="activity",
        entity_id=activity.id,
    )
    await session.commit()
    return activity


async def add_image(
    session: AsyncSession, activity_id: uuid.UUID, file: UploadFile, *, actor_id: uuid.UUID
) -> ArticleImageOut:
    if await session.get(Activity, activity_id) is None:
        raise NotFoundError("Activity not found.")
    images = await _images(session, activity_id)
    if len(images) >= 10:
        raise ConflictError("An article may contain at most ten images.")
    image = ActivityImage(
        activity_id=activity_id,
        file_path=await save_upload(file, subdir="article-media/activities"),
        sort_order=len(images),
    )
    session.add(image)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.image_add",
        entity_type="activity",
        entity_id=activity_id,
    )
    await session.commit()
    return _image_out(image)


async def patch_image(
    session: AsyncSession,
    activity_id: uuid.UUID,
    image_id: uuid.UUID,
    data: ArticleImagePatch,
    *,
    actor_id: uuid.UUID,
) -> ArticleImageOut:
    image = await session.get(ActivityImage, image_id)
    if image is None or image.activity_id != activity_id:
        raise NotFoundError("Article image not found.")
    if data.alt_text is not None:
        image.alt_text = data.alt_text
    if data.caption is not None:
        image.caption = data.caption
    if data.is_cover is True:
        for candidate in await _images(session, activity_id):
            candidate.is_cover = candidate.id == image.id
    elif data.is_cover is False:
        image.is_cover = False
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.image_update",
        entity_type="activity",
        entity_id=activity_id,
    )
    await session.commit()
    return _image_out(image)


async def order_images(
    session: AsyncSession, activity_id: uuid.UUID, data: ImageOrderIn, *, actor_id: uuid.UUID
) -> list[ArticleImageOut]:
    current = {image.id: image for image in await _images(session, activity_id)}
    if len(data.image_ids) != len(set(data.image_ids)) or set(data.image_ids) != set(current):
        raise ConflictError("Image order must include each image exactly once.")
    for position, image_id in enumerate(data.image_ids):
        current[image_id].sort_order = position + 100
    await session.flush()
    for position, image_id in enumerate(data.image_ids):
        current[image_id].sort_order = position
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.image_order",
        entity_type="activity",
        entity_id=activity_id,
    )
    await session.commit()
    return [_image_out(current[image_id]) for image_id in data.image_ids]


async def delete_image(
    session: AsyncSession, activity_id: uuid.UUID, image_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    image = await session.get(ActivityImage, image_id)
    if image is None or image.activity_id != activity_id:
        raise NotFoundError("Article image not found.")
    path = Path(settings.upload_dir) / image.file_path
    await session.delete(image)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.image_delete",
        entity_type="activity",
        entity_id=activity_id,
    )
    await session.commit()
    path.unlink(missing_ok=True)
