"""HTTP routes for informational donation-drive articles."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, UploadFile

from src.core.deps import CurrentUser, require_role
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.alerts.schemas import ArticleImageOut, ArticleImagePatch, ImageOrderIn
from src.modules.donations import service
from src.modules.donations.schemas import DonationDriveDetail, DonationDriveIn, PublicDonationDrive

public_router = APIRouter(tags=["donations"])
admin_router = APIRouter(tags=["donations"])


@public_router.get("/donation-drives")
async def public_donation_drives(
    session: DbSessionDep, page: int = 1, size: int = 20, status: str | None = None
) -> Page[PublicDonationDrive]:
    return await service.list_donation_drives(session, page=page, size=size, status=status)


@public_router.get("/donation-drives/{slug}")
async def public_donation_drive_detail(slug: str, session: DbSessionDep) -> DonationDriveDetail:
    return await service.get_drive_by_slug(session, slug)


@admin_router.get("/donation-drives", dependencies=[Depends(require_role("admin", "sk"))])
async def admin_list_donation_drives(session: DbSessionDep) -> list[PublicDonationDrive]:
    return await service.list_donation_drives_admin(session)


@admin_router.post("/donation-drives", dependencies=[Depends(require_role("admin", "sk"))])
async def admin_create_donation_drive(
    body: DonationDriveIn, session: DbSessionDep, user: CurrentUser
) -> PublicDonationDrive:
    drive = await service.create_donation_drive(session, body, actor_id=user.id)
    return next(
        item for item in await service.list_donation_drives_admin(session) if item.id == drive.id
    )


@admin_router.get(
    "/donation-drives/{drive_id}", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_donation_drive_detail(
    drive_id: uuid.UUID, session: DbSessionDep
) -> DonationDriveDetail:
    return await service.get_drive(session, drive_id, public=False)


@admin_router.patch(
    "/donation-drives/{drive_id}", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_update_donation_drive(
    drive_id: uuid.UUID, body: DonationDriveIn, session: DbSessionDep, user: CurrentUser
) -> PublicDonationDrive:
    drive = await service.update_donation_drive(session, drive_id, body, actor_id=user.id)
    return next(
        item for item in await service.list_donation_drives_admin(session) if item.id == drive.id
    )


@admin_router.post(
    "/donation-drives/{drive_id}/images", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_add_donation_drive_image(
    drive_id: uuid.UUID,
    session: DbSessionDep,
    user: CurrentUser,
    file: UploadFile = File(...),  # noqa: B008
) -> ArticleImageOut:
    return await service.add_image(session, drive_id, file, actor_id=user.id)


@admin_router.patch(
    "/donation-drives/{drive_id}/images/{image_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
)
async def admin_patch_donation_drive_image(
    drive_id: uuid.UUID,
    image_id: uuid.UUID,
    body: ArticleImagePatch,
    session: DbSessionDep,
    user: CurrentUser,
) -> ArticleImageOut:
    return await service.patch_image(session, drive_id, image_id, body, actor_id=user.id)


@admin_router.put(
    "/donation-drives/{drive_id}/images/order", dependencies=[Depends(require_role("admin", "sk"))]
)
async def admin_order_donation_drive_images(
    drive_id: uuid.UUID, body: ImageOrderIn, session: DbSessionDep, user: CurrentUser
) -> list[ArticleImageOut]:
    return await service.order_images(session, drive_id, body, actor_id=user.id)


@admin_router.delete(
    "/donation-drives/{drive_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="Delete a donation drive and its images",
)
async def admin_delete_donation_drive(
    drive_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_donation_drive(session, drive_id, actor_id=user.id)
    return {"ok": True}


@admin_router.delete(
    "/donation-drives/{drive_id}/images/{image_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
)
async def admin_delete_donation_drive_image(
    drive_id: uuid.UUID, image_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_image(session, drive_id, image_id, actor_id=user.id)
    return {"ok": True}
