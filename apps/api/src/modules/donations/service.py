"""Informational donation-drive article services (FR-DON-001, 015…017)."""

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
from src.modules.alerts.schemas import ArticleImageOut, ArticleImagePatch, ImageOrderIn
from src.modules.donations.models import DonationDrive, DonationDriveImage
from src.modules.donations.schemas import DonationDriveDetail, DonationDriveIn, PublicDonationDrive
from src.modules.evacuation.service import get_event_names


def _image_out(image: DonationDriveImage) -> ArticleImageOut:
    return ArticleImageOut(
        id=image.id,
        url=f"/uploads/{image.file_path}",
        sort_order=image.sort_order,
        is_cover=image.is_cover,
    )


async def _images(session: AsyncSession, drive_id: uuid.UUID) -> list[DonationDriveImage]:
    return (
        (
            await session.execute(
                select(DonationDriveImage)
                .where(DonationDriveImage.donation_drive_id == drive_id)
                .order_by(DonationDriveImage.sort_order)
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
        stmt = select(DonationDrive.id).where(DonationDrive.slug == candidate)
        if exclude_id:
            stmt = stmt.where(DonationDrive.id != exclude_id)
        if (await session.execute(stmt)).scalar_one_or_none() is None:
            return candidate
        candidate, number = f"{base}-{number}", number + 1


def _ensure_publishable(images: list[DonationDriveImage]) -> None:
    if len(images) > 10:
        raise ConflictError("An article may contain at most ten images.")
    if len([image for image in images if image.is_cover]) != 1:
        raise ConflictError("A published donation drive needs exactly one cover image.")


async def _to_public(
    session: AsyncSession, drive: DonationDrive, event_name: str | None
) -> PublicDonationDrive:
    images = await _images(session, drive.id)
    cover = next((image for image in images if image.is_cover), None)
    return PublicDonationDrive(
        id=drive.id,
        slug=drive.slug,
        title=drive.title,
        excerpt=drive.excerpt,
        event_id=drive.event_id,
        event_name=event_name,
        organizer_name=drive.organizer_name,
        organizer_contact=drive.organizer_contact,
        drop_off_instructions=drive.drop_off_instructions,
        active_from=drive.active_from,
        active_until=drive.active_until,
        published_at=drive.published_at,
        archived_at=drive.archived_at,
        cover_image=_image_out(cover) if cover else None,
    )


async def _event_name(session: AsyncSession, event_id: uuid.UUID | None) -> str | None:
    if event_id is None:
        return None
    return (await get_event_names(session, [event_id])).get(event_id)


async def list_donation_drives(
    session: AsyncSession, *, page: int = 1, size: int = 20, status: str | None = None
) -> Page[PublicDonationDrive]:
    now = datetime.now(UTC)
    stmt = select(DonationDrive).where(
        DonationDrive.publication_status.in_(("published", "archived"))
    )
    if status == "active":
        stmt = (
            stmt.where(DonationDrive.publication_status == "published")
            .where((DonationDrive.active_from.is_(None)) | (DonationDrive.active_from <= now))
            .where((DonationDrive.active_until.is_(None)) | (DonationDrive.active_until >= now))
        )
    elif status in ("completed", "past", "archived"):
        stmt = stmt.where(
            (DonationDrive.publication_status == "archived")
            | ((DonationDrive.active_until.is_not(None)) & (DonationDrive.active_until < now))
        )
    else:
        stmt = stmt.where(DonationDrive.publication_status == "published")

    stmt = stmt.order_by(DonationDrive.published_at.asc().nullslast(), DonationDrive.title)
    drives = (await session.execute(stmt)).scalars().all()
    names = await get_event_names(session, [drive.event_id for drive in drives if drive.event_id])
    page_drives = drives[(page - 1) * size : page * size]
    return Page[PublicDonationDrive](
        items=[
            await _to_public(session, drive, names.get(drive.event_id)) for drive in page_drives
        ],
        **page_meta(len(drives), page, size),
    )


async def list_donation_drives_admin(session: AsyncSession) -> list[PublicDonationDrive]:
    drives = (
        (
            await session.execute(
                select(DonationDrive).order_by(
                    DonationDrive.published_at.desc().nullslast(), DonationDrive.title
                )
            )
        )
        .scalars()
        .all()
    )
    names = await get_event_names(session, [drive.event_id for drive in drives if drive.event_id])
    return [await _to_public(session, drive, names.get(drive.event_id)) for drive in drives]


async def get_drive(
    session: AsyncSession, drive_id: uuid.UUID, *, public: bool
) -> DonationDriveDetail:
    stmt = select(DonationDrive).where(DonationDrive.id == drive_id)
    if public:
        stmt = stmt.where(DonationDrive.publication_status.in_(("published", "archived")))
    drive = (await session.execute(stmt)).scalar_one_or_none()
    if drive is None:
        raise NotFoundError("Donation drive not found.")
    preview = await _to_public(session, drive, await _event_name(session, drive.event_id))
    return DonationDriveDetail(
        **preview.model_dump(),
        body_json=drive.body_json,
        images=[_image_out(image) for image in await _images(session, drive.id)],
    )


async def get_drive_by_slug(session: AsyncSession, slug: str) -> DonationDriveDetail:
    drive = (
        await session.execute(
            select(DonationDrive).where(
                DonationDrive.slug == slug,
                DonationDrive.publication_status.in_(("published", "archived")),
            )
        )
    ).scalar_one_or_none()
    if drive is None:
        raise NotFoundError("Donation drive not found.")
    preview = await _to_public(session, drive, await _event_name(session, drive.event_id))
    return DonationDriveDetail(
        **preview.model_dump(),
        body_json=drive.body_json,
        images=[_image_out(image) for image in await _images(session, drive.id)],
    )


async def create_donation_drive(
    session: AsyncSession, data: DonationDriveIn, *, actor_id: uuid.UUID
) -> DonationDrive:
    now = datetime.now(UTC)
    drive = DonationDrive(
        **data.model_dump(exclude={"publication_status"}),
        slug=await _unique_slug(session, data.title),
        publication_status=data.publication_status,
        published_at=now if data.publication_status == "published" else None,
        archived_at=now if data.publication_status == "archived" else None,
        created_by_user_id=actor_id,
    )
    session.add(drive)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=f"donation_drive.{data.publication_status}",
        entity_type="donation_drive",
        entity_id=drive.id,
    )
    await session.commit()
    return drive


async def update_donation_drive(
    session: AsyncSession, drive_id: uuid.UUID, data: DonationDriveIn, *, actor_id: uuid.UUID
) -> DonationDrive:
    drive = await session.get(DonationDrive, drive_id)
    if drive is None:
        raise NotFoundError("Donation drive not found.")
    for key, value in data.model_dump(exclude={"publication_status"}).items():
        setattr(drive, key, value)
    if drive.slug != slug_base(data.title):
        drive.slug = await _unique_slug(session, data.title, exclude_id=drive.id)
    now = datetime.now(UTC)
    if data.publication_status == "published":
        _ensure_publishable(await _images(session, drive.id))
        drive.published_at, drive.archived_at = drive.published_at or now, None
    elif data.publication_status == "archived":
        drive.archived_at = now
    drive.publication_status = data.publication_status
    await write_audit(
        session,
        actor_user_id=actor_id,
        action=f"donation_drive.{data.publication_status}",
        entity_type="donation_drive",
        entity_id=drive.id,
    )
    await session.commit()
    return drive


async def delete_donation_drive(
    session: AsyncSession, drive_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    drive = await session.get(DonationDrive, drive_id)
    if drive is None:
        raise NotFoundError("Donation drive not found.")
    images = await _images(session, drive_id)
    for image in images:
        path = Path(settings.upload_dir) / image.file_path
        path.unlink(missing_ok=True)
    await session.delete(drive)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation_drive.delete",
        entity_type="donation_drive",
        entity_id=drive_id,
    )
    await session.commit()


async def add_image(
    session: AsyncSession, drive_id: uuid.UUID, file: UploadFile, *, actor_id: uuid.UUID
) -> ArticleImageOut:
    if await session.get(DonationDrive, drive_id) is None:
        raise NotFoundError("Donation drive not found.")
    images = await _images(session, drive_id)
    if len(images) >= 10:
        raise ConflictError("An article may contain at most ten images.")
    image = DonationDriveImage(
        donation_drive_id=drive_id,
        file_path=await save_upload(file, subdir="article-media/donation-drives"),
        sort_order=len(images),
    )
    session.add(image)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation_drive.image_add",
        entity_type="donation_drive",
        entity_id=drive_id,
    )
    await session.commit()
    return _image_out(image)


async def patch_image(
    session: AsyncSession,
    drive_id: uuid.UUID,
    image_id: uuid.UUID,
    data: ArticleImagePatch,
    *,
    actor_id: uuid.UUID,
) -> ArticleImageOut:
    image = await session.get(DonationDriveImage, image_id)
    if image is None or image.donation_drive_id != drive_id:
        raise NotFoundError("Article image not found.")
    if data.is_cover is True:
        for candidate in await _images(session, drive_id):
            candidate.is_cover = candidate.id == image.id
    elif data.is_cover is False:
        image.is_cover = False
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation_drive.image_update",
        entity_type="donation_drive",
        entity_id=drive_id,
    )
    await session.commit()
    return _image_out(image)


async def order_images(
    session: AsyncSession, drive_id: uuid.UUID, data: ImageOrderIn, *, actor_id: uuid.UUID
) -> list[ArticleImageOut]:
    current = {image.id: image for image in await _images(session, drive_id)}
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
        action="donation_drive.image_order",
        entity_type="donation_drive",
        entity_id=drive_id,
    )
    await session.commit()
    return [_image_out(current[image_id]) for image_id in data.image_ids]


async def delete_image(
    session: AsyncSession, drive_id: uuid.UUID, image_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    image = await session.get(DonationDriveImage, image_id)
    if image is None or image.donation_drive_id != drive_id:
        raise NotFoundError("Article image not found.")
    path = Path(settings.upload_dir) / image.file_path
    await session.delete(image)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation_drive.image_delete",
        entity_type="donation_drive",
        entity_id=drive_id,
    )
    await session.commit()
    path.unlink(missing_ok=True)
