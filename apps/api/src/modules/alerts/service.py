"""Business logic for alerts and the announcement article workflow (FR-ALT-*)."""

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
from src.domain.article_document import document_plain_text, slug_base
from src.modules.alerts.models import AlertPrompt, Announcement, AnnouncementArea, AnnouncementImage
from src.modules.alerts.schemas import (
    AdminAnnouncementDetail,
    AlertPromptOut,
    AnnouncementDetail,
    AnnouncementIn,
    ArticleImageOut,
    ArticleImagePatch,
    ImageOrderIn,
    PublicAnnouncement,
)
from src.modules.geo.models import Area
from src.modules.users.models import User


def _image_out(image: AnnouncementImage) -> ArticleImageOut:
    return ArticleImageOut(
        id=image.id,
        url=f"/uploads/{image.file_path}",
        alt_text=image.alt_text,
        caption=image.caption,
        sort_order=image.sort_order,
        is_cover=image.is_cover,
    )


async def _images(session: AsyncSession, announcement_id: uuid.UUID) -> list[AnnouncementImage]:
    return (
        (
            await session.execute(
                select(AnnouncementImage)
                .where(AnnouncementImage.announcement_id == announcement_id)
                .order_by(AnnouncementImage.sort_order)
            )
        )
        .scalars()
        .all()
    )


async def _area_names_by_announcement(
    session: AsyncSession, announcement_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[str]]:
    if not announcement_ids:
        return {}
    rows = (
        await session.execute(
            select(AnnouncementArea.announcement_id, Area.name)
            .join(Area, AnnouncementArea.area_id == Area.id)
            .where(AnnouncementArea.announcement_id.in_(announcement_ids))
        )
    ).all()
    out: dict[uuid.UUID, list[str]] = {aid: [] for aid in announcement_ids}
    for announcement_id, name in rows:
        out[announcement_id].append(name)
    return out


async def _area_ids_by_announcement(
    session: AsyncSession, announcement_id: uuid.UUID
) -> list[uuid.UUID]:
    return list(
        (
            await session.execute(
                select(AnnouncementArea.area_id).where(
                    AnnouncementArea.announcement_id == announcement_id
                )
            )
        ).scalars()
    )


def _is_active(a: Announcement, *, now: datetime) -> bool:
    return (
        a.kind == "alert"
        and a.publication_status == "published"
        and a.published_at is not None
        and a.deactivated_at is None
        and (a.expires_at is None or a.expires_at > now)
    )


async def _to_public(
    session: AsyncSession, rows: list[tuple[Announcement, str]]
) -> list[PublicAnnouncement]:
    now = datetime.now(UTC)
    area_names = await _area_names_by_announcement(session, [a.id for a, _ in rows])
    out: list[PublicAnnouncement] = []
    for a, issuer_name in rows:
        images = await _images(session, a.id)
        cover = next((image for image in images if image.is_cover), None)
        out.append(
            PublicAnnouncement(
                id=a.id,
                slug=a.slug,
                kind=a.kind,
                type=a.type,
                severity=a.severity,
                title=a.title,
                excerpt=a.excerpt,
                body=document_plain_text(a.body_json),
                instruction=a.instruction,
                is_barangay_wide=a.is_barangay_wide,
                published_at=a.published_at,
                expires_at=a.expires_at,
                deactivated_at=a.deactivated_at,
                archived_at=a.archived_at,
                area_names=area_names.get(a.id, []),
                issued_by_name=issuer_name,
                is_active=_is_active(a, now=now),
                cover_image=_image_out(cover) if cover else None,
            )
        )
    return out


async def _unique_slug(
    session: AsyncSession, title: str, *, exclude_id: uuid.UUID | None = None
) -> str:
    base = slug_base(title)
    candidate = base
    number = 2
    while True:
        stmt = select(Announcement.id).where(Announcement.slug == candidate)
        if exclude_id:
            stmt = stmt.where(Announcement.id != exclude_id)
        if (await session.execute(stmt)).scalar_one_or_none() is None:
            return candidate
        candidate = f"{base}-{number}"
        number += 1


def _ensure_publishable(a: Announcement, images: list[AnnouncementImage]) -> None:
    if a.kind == "alert":
        if not a.instruction:
            raise ConflictError(
                "An emergency alert needs a clear instruction before it can be published."
            )
        return
    covers = [image for image in images if image.is_cover]
    if len(images) > 10:
        raise ConflictError("An article may contain at most ten images.")
    if len(covers) != 1:
        raise ConflictError("A published announcement needs exactly one cover image.")
    if any(not image.alt_text.strip() for image in images):
        raise ConflictError("Add meaningful alt text to every image before publishing.")


async def list_announcements(
    session: AsyncSession, *, page: int = 1, size: int = 20, kind: str | None = None
) -> Page[PublicAnnouncement]:
    stmt = (
        select(Announcement, User.full_name)
        .join(User, Announcement.issued_by_user_id == User.id)
        .where(Announcement.publication_status == "published")
        .order_by(Announcement.published_at.desc())
    )
    if kind:
        stmt = stmt.where(Announcement.kind == kind)
    all_rows = (await session.execute(stmt)).all()
    rows = all_rows[(page - 1) * size : page * size]
    return Page[PublicAnnouncement](
        items=await _to_public(session, rows), **page_meta(len(all_rows), page, size)
    )


async def get_announcement_by_slug(session: AsyncSession, slug: str) -> AnnouncementDetail:
    row = (
        await session.execute(
            select(Announcement, User.full_name)
            .join(User, Announcement.issued_by_user_id == User.id)
            .where(
                Announcement.slug == slug,
                Announcement.publication_status.in_(("published", "archived")),
            )
        )
    ).one_or_none()
    if row is None:
        raise NotFoundError("Announcement not found.")
    preview = (await _to_public(session, [row]))[0]
    return AnnouncementDetail(
        **preview.model_dump(),
        body_json=row[0].body_json,
        images=[_image_out(i) for i in await _images(session, row[0].id)],
    )


async def get_active_alert(session: AsyncSession) -> PublicAnnouncement | None:
    now = datetime.now(UTC)
    rows = (
        await session.execute(
            select(Announcement, User.full_name)
            .join(User, Announcement.issued_by_user_id == User.id)
            .where(Announcement.kind == "alert", Announcement.publication_status == "published")
            .order_by(Announcement.published_at.desc())
        )
    ).all()
    active = [(a, name) for a, name in rows if _is_active(a, now=now)]
    return (await _to_public(session, active[:1]))[0] if active else None


async def _apply_areas(
    session: AsyncSession, announcement: Announcement, area_ids: list[uuid.UUID]
) -> None:
    old = await session.execute(
        select(AnnouncementArea).where(AnnouncementArea.announcement_id == announcement.id)
    )
    for row in old.scalars():
        await session.delete(row)
    for area_id in area_ids:
        session.add(AnnouncementArea(announcement_id=announcement.id, area_id=area_id))


async def create_announcement(
    session: AsyncSession, data: AnnouncementIn, *, actor_id: uuid.UUID
) -> PublicAnnouncement:
    now = datetime.now(UTC)
    announcement = Announcement(
        kind=data.kind,
        type=data.type,
        severity=data.severity,
        title=data.title,
        slug=await _unique_slug(session, data.title),
        excerpt=data.excerpt,
        body_json=data.body_json,
        publication_status=data.publication_status,
        instruction=data.instruction,
        is_barangay_wide=data.is_barangay_wide,
        published_at=now if data.publication_status == "published" else None,
        archived_at=now if data.publication_status == "archived" else None,
        expires_at=data.expires_at,
        issued_by_user_id=actor_id,
    )
    session.add(announcement)
    await session.flush()
    await _apply_areas(session, announcement, data.area_ids)
    if data.publication_status == "published":
        _ensure_publishable(announcement, [])
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=f"announcement.{data.publication_status}",
        entity_type="announcement",
        entity_id=announcement.id,
    )
    await session.commit()
    user = await session.get(User, actor_id)
    return (await _to_public(session, [(announcement, user.full_name)]))[0]


async def update_announcement(
    session: AsyncSession, announcement_id: uuid.UUID, data: AnnouncementIn, *, actor_id: uuid.UUID
) -> PublicAnnouncement:
    announcement = await session.get(Announcement, announcement_id)
    if announcement is None:
        raise NotFoundError("Announcement not found.")
    now = datetime.now(UTC)
    announcement.kind, announcement.type = data.kind, data.type
    announcement.severity = data.severity
    announcement.title, announcement.excerpt, announcement.body_json = (
        data.title,
        data.excerpt,
        data.body_json,
    )
    announcement.instruction = data.instruction
    announcement.is_barangay_wide, announcement.expires_at = data.is_barangay_wide, data.expires_at
    if announcement.slug != slug_base(data.title):
        announcement.slug = await _unique_slug(session, data.title, exclude_id=announcement.id)
    if data.publication_status == "published":
        _ensure_publishable(announcement, await _images(session, announcement.id))
        announcement.published_at = announcement.published_at or now
        announcement.archived_at = None
    elif data.publication_status == "archived":
        announcement.archived_at = now
    announcement.publication_status = data.publication_status
    await _apply_areas(session, announcement, data.area_ids)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=f"announcement.{data.publication_status}",
        entity_type="announcement",
        entity_id=announcement.id,
    )
    await session.commit()
    user = await session.get(User, announcement.issued_by_user_id)
    return (await _to_public(session, [(announcement, user.full_name)]))[0]


async def deactivate_announcement(
    session: AsyncSession, announcement_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    announcement = await session.get(Announcement, announcement_id)
    if announcement is None:
        raise NotFoundError("Announcement not found.")
    announcement.deactivated_at = datetime.now(UTC)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="announcement.deactivate",
        entity_type="announcement",
        entity_id=announcement.id,
    )
    await session.commit()


async def list_announcements_admin(session: AsyncSession) -> list[PublicAnnouncement]:
    rows = (
        await session.execute(
            select(Announcement, User.full_name)
            .join(User, Announcement.issued_by_user_id == User.id)
            .where(Announcement.deactivated_at.is_(None))
            .order_by(Announcement.created_at.desc())
        )
    ).all()
    return await _to_public(session, rows)


async def get_announcement_admin(
    session: AsyncSession, announcement_id: uuid.UUID
) -> AdminAnnouncementDetail:
    row = (
        await session.execute(
            select(Announcement, User.full_name)
            .join(User, Announcement.issued_by_user_id == User.id)
            .where(Announcement.id == announcement_id)
        )
    ).one_or_none()
    if row is None:
        raise NotFoundError("Announcement not found.")
    preview = (await _to_public(session, [row]))[0]
    return AdminAnnouncementDetail(
        **preview.model_dump(),
        body_json=row[0].body_json,
        images=[_image_out(i) for i in await _images(session, row[0].id)],
        area_ids=await _area_ids_by_announcement(session, row[0].id),
    )


async def add_image(
    session: AsyncSession, announcement_id: uuid.UUID, file: UploadFile, *, actor_id: uuid.UUID
) -> ArticleImageOut:
    if await session.get(Announcement, announcement_id) is None:
        raise NotFoundError("Announcement not found.")
    images = await _images(session, announcement_id)
    if len(images) >= 10:
        raise ConflictError("An article may contain at most ten images.")
    file_path = await save_upload(file, subdir="article-media/announcements")
    image = AnnouncementImage(
        announcement_id=announcement_id, file_path=file_path, sort_order=len(images)
    )
    session.add(image)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="announcement.image_add",
        entity_type="announcement",
        entity_id=announcement_id,
    )
    await session.commit()
    return _image_out(image)


async def patch_image(
    session: AsyncSession,
    announcement_id: uuid.UUID,
    image_id: uuid.UUID,
    data: ArticleImagePatch,
    *,
    actor_id: uuid.UUID,
) -> ArticleImageOut:
    image = await session.get(AnnouncementImage, image_id)
    if image is None or image.announcement_id != announcement_id:
        raise NotFoundError("Article image not found.")
    if data.alt_text is not None:
        image.alt_text = data.alt_text
    if data.caption is not None:
        image.caption = data.caption
    if data.is_cover is True:
        for candidate in await _images(session, announcement_id):
            candidate.is_cover = candidate.id == image.id
    elif data.is_cover is False:
        image.is_cover = False
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="announcement.image_update",
        entity_type="announcement",
        entity_id=announcement_id,
    )
    await session.commit()
    return _image_out(image)


async def order_images(
    session: AsyncSession, announcement_id: uuid.UUID, data: ImageOrderIn, *, actor_id: uuid.UUID
) -> list[ArticleImageOut]:
    images = await _images(session, announcement_id)
    current = {image.id: image for image in images}
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
        action="announcement.image_order",
        entity_type="announcement",
        entity_id=announcement_id,
    )
    await session.commit()
    return [_image_out(current[image_id]) for image_id in data.image_ids]


async def delete_image(
    session: AsyncSession, announcement_id: uuid.UUID, image_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    image = await session.get(AnnouncementImage, image_id)
    if image is None or image.announcement_id != announcement_id:
        raise NotFoundError("Article image not found.")
    path = Path(settings.upload_dir) / image.file_path
    await session.delete(image)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="announcement.image_delete",
        entity_type="announcement",
        entity_id=announcement_id,
    )
    await session.commit()
    path.unlink(missing_ok=True)


# --- alert prompts (FR-WX-009) -------------------------------------------------


async def list_alert_prompts(
    session: AsyncSession, *, unresolved_only: bool = True
) -> list[AlertPromptOut]:
    stmt = select(AlertPrompt).order_by(AlertPrompt.created_at.desc())
    if unresolved_only:
        stmt = stmt.where(AlertPrompt.acknowledged_at.is_(None))
    return [
        AlertPromptOut(
            id=p.id,
            reading_id=p.reading_id,
            level=p.level,
            threshold_value=float(p.threshold_value),
            created_at=p.created_at,
            acknowledged_by_user_id=p.acknowledged_by_user_id,
            acknowledged_at=p.acknowledged_at,
            resulted_in_announcement_id=p.resulted_in_announcement_id,
        )
        for p in (await session.execute(stmt)).scalars().all()
    ]


async def create_alert_prompt_if_new(
    session: AsyncSession, *, reading_id: int, level: int, threshold_value: float
) -> AlertPrompt | None:
    if (
        await session.execute(select(AlertPrompt).where(AlertPrompt.reading_id == reading_id))
    ).scalar_one_or_none() is not None:
        return None
    prompt = AlertPrompt(reading_id=reading_id, level=level, threshold_value=threshold_value)
    session.add(prompt)
    await session.flush()
    return prompt


async def acknowledge_alert_prompt(
    session: AsyncSession,
    prompt_id: uuid.UUID,
    *,
    actor_id: uuid.UUID,
    resulted_in_announcement_id: uuid.UUID | None,
) -> None:
    prompt = await session.get(AlertPrompt, prompt_id)
    if prompt is None:
        raise NotFoundError("Alert prompt not found.")
    prompt.acknowledged_by_user_id, prompt.acknowledged_at = actor_id, datetime.now(UTC)
    prompt.resulted_in_announcement_id = resulted_in_announcement_id
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="alert_prompt.acknowledge",
        entity_type="alert_prompt",
        entity_id=prompt.id,
    )
    await session.commit()
