"""HTTP surface for the donations module (FR-DON-*).

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
from src.modules.donations import service
from src.modules.donations.schemas import (
    DonationDriveIn,
    DonationOut,
    DonationStatusPatch,
    PublicDonationDrive,
)

public_router = APIRouter(tags=["donations"])
admin_router = APIRouter(tags=["donations"])


@public_router.get("/donation-drives", summary="Active donation drives and their progress")
async def public_donation_drives(
    session: DbSessionDep, page: int = 1, size: int = 20, status: str = "open"
) -> Page[PublicDonationDrive]:
    return await service.list_donation_drives(session, page=page, size=size, status=status)


@admin_router.get(
    "/donation-drives",
    dependencies=[Depends(require_role("admin"))],
    summary="List all donation drives",
)
async def admin_list_donation_drives(session: DbSessionDep) -> list[PublicDonationDrive]:
    return await service.list_donation_drives_admin(session)


@admin_router.post(
    "/donation-drives",
    dependencies=[Depends(require_role("admin"))],
    summary="Create a donation drive",
)
async def admin_create_donation_drive(
    body: DonationDriveIn, session: DbSessionDep, user: CurrentUser
) -> dict[str, str]:
    drive = await service.create_donation_drive(session, body, actor_id=user.id)
    return {"id": str(drive.id)}


@admin_router.post(
    "/donation-drives/{drive_id}/close",
    dependencies=[Depends(require_role("admin"))],
    summary="Close a drive",
)
async def admin_close_donation_drive(
    drive_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.close_donation_drive(session, drive_id, actor_id=user.id)
    return {"ok": True}


@admin_router.get(
    "/donation-drives/{drive_id}/donations",
    dependencies=[Depends(require_role("admin"))],
    summary="Donations received for a drive",
)
async def admin_list_donations(drive_id: uuid.UUID, session: DbSessionDep) -> list[DonationOut]:
    return await service.list_donations_admin(session, drive_id)


@admin_router.patch(
    "/donations/{donation_id}/status",
    dependencies=[Depends(require_role("admin"))],
    summary="Change a donation's status (FR-DON-005/006)",
)
async def admin_update_donation_status(
    donation_id: uuid.UUID, body: DonationStatusPatch, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.update_donation_status(session, donation_id, body, actor_id=user.id)
    return {"ok": True}
