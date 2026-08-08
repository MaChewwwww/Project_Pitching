"""Business logic and transaction boundaries for the donations module (FR-DON-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import NotFoundError
from src.core.pagination import Page, page_meta
from src.modules.donations.models import Donation, DonationDrive, DriveNeed
from src.modules.donations.schemas import (
    DonationDriveIn,
    DonationOut,
    DonationStatusPatch,
    PublicDonationDrive,
    PublicDriveNeed,
)
from src.modules.evacuation.service import get_event_names


def _reference_no() -> str:
    # e.g. DON-7F3A9C21 — short enough to quote over the phone (FR-DON-003).
    return f"DON-{secrets.token_hex(4).upper()}"


async def _needs_with_progress(session: AsyncSession, drive_id: uuid.UUID) -> list[PublicDriveNeed]:
    needs = (
        (
            await session.execute(
                select(DriveNeed)
                .where(DriveNeed.drive_id == drive_id)
                .order_by(DriveNeed.sort_order)
            )
        )
        .scalars()
        .all()
    )
    out = []
    for need in needs:
        sums = (
            await session.execute(
                select(
                    func.coalesce(func.sum(Donation.quantity_received), 0),
                    func.coalesce(func.sum(Donation.quantity_pledged), 0),
                ).where(Donation.drive_need_id == need.id)
            )
        ).one()
        received, pledged = float(sums[0]), float(sums[1])
        target = float(need.target_quantity) or 1.0
        out.append(
            PublicDriveNeed(
                id=need.id,
                item_name=need.item_name,
                target_quantity=float(need.target_quantity),
                unit=need.unit,
                sort_order=need.sort_order,
                received_quantity=received,
                pledged_quantity=pledged,
                progress_pct=round(min(100.0, 100 * received / target), 1),
            )
        )
    return out


async def _drive_to_public(
    session: AsyncSession, drive: DonationDrive, event_name: str | None
) -> PublicDonationDrive:
    needs = await _needs_with_progress(session, drive.id)
    overall = round(sum(n.progress_pct for n in needs) / len(needs), 1) if needs else 0.0
    return PublicDonationDrive(
        id=drive.id,
        title=drive.title,
        description=drive.description,
        status=drive.status,
        opened_at=drive.opened_at,
        closed_at=drive.closed_at,
        event_id=drive.event_id,
        event_name=event_name,
        needs=needs,
        overall_progress_pct=overall,
    )


async def list_donation_drives(
    session: AsyncSession, *, page: int = 1, size: int = 20, status: str | None = "open"
) -> Page[PublicDonationDrive]:
    stmt = select(DonationDrive)
    if status:
        stmt = stmt.where(DonationDrive.status == status)
    stmt = stmt.order_by(DonationDrive.opened_at.desc())

    total = len((await session.execute(stmt)).all())
    drives = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    event_names = await get_event_names(session, [d.event_id for d in drives if d.event_id])
    items = [await _drive_to_public(session, d, event_names.get(d.event_id)) for d in drives]
    return Page[PublicDonationDrive](items=items, **page_meta(total, page, size))


async def list_donation_drives_admin(session: AsyncSession) -> list[PublicDonationDrive]:
    drives = (
        (await session.execute(select(DonationDrive).order_by(DonationDrive.opened_at.desc())))
        .scalars()
        .all()
    )
    event_names = await get_event_names(session, [d.event_id for d in drives if d.event_id])
    return [await _drive_to_public(session, d, event_names.get(d.event_id)) for d in drives]


async def create_donation_drive(
    session: AsyncSession, data: DonationDriveIn, *, actor_id: uuid.UUID
) -> DonationDrive:
    drive = DonationDrive(
        title=data.title, description=data.description, created_by_user_id=actor_id
    )
    session.add(drive)
    await session.flush()
    for need in data.needs:
        session.add(DriveNeed(drive_id=drive.id, **need.model_dump()))
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation_drive.create",
        entity_type="donation_drive",
        entity_id=drive.id,
    )
    await session.commit()
    return drive


async def close_donation_drive(
    session: AsyncSession, drive_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    drive = await session.get(DonationDrive, drive_id)
    if drive is None:
        raise NotFoundError("Donation drive not found.")
    drive.status = "closed"
    drive.closed_at = datetime.now(UTC)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation_drive.close",
        entity_type="donation_drive",
        entity_id=drive.id,
    )
    await session.commit()


# --- donations (mostly walk-in recording here; the public no-account form is
# out of this pass's CRUD scope, but status transitions are core admin work) --


async def list_donations_admin(session: AsyncSession, drive_id: uuid.UUID) -> list[DonationOut]:
    rows = (
        (
            await session.execute(
                select(Donation)
                .where(Donation.drive_id == drive_id)
                .order_by(Donation.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [
        DonationOut(
            id=d.id,
            drive_id=d.drive_id,
            reference_no=d.reference_no,
            donor_name=d.donor_name,
            donor_contact=d.donor_contact,
            item_name=d.item_name,
            quantity_pledged=float(d.quantity_pledged),
            quantity_received=float(d.quantity_received)
            if d.quantity_received is not None
            else None,
            unit=d.unit,
            status=d.status,
            is_walk_in=d.is_walk_in,
            created_at=d.created_at,
        )
        for d in rows
    ]


async def record_walk_in_donation(
    session: AsyncSession,
    *,
    drive_id: uuid.UUID,
    drive_need_id: uuid.UUID | None,
    donor_name: str,
    donor_contact: str | None,
    item_name: str,
    quantity_pledged: float,
    unit: str,
    actor_id: uuid.UUID,
) -> Donation:
    donation = Donation(
        drive_id=drive_id,
        drive_need_id=drive_need_id,
        reference_no=_reference_no(),
        donor_name=donor_name,
        donor_contact=donor_contact,
        item_name=item_name,
        quantity_pledged=quantity_pledged,
        unit=unit,
        is_walk_in=True,
    )
    session.add(donation)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation.record_walk_in",
        entity_type="donation",
        entity_id=donation.id,
    )
    await session.commit()
    return donation


async def update_donation_status(
    session: AsyncSession, donation_id: uuid.UUID, data: DonationStatusPatch, *, actor_id: uuid.UUID
) -> None:
    donation = await session.get(Donation, donation_id)
    if donation is None:
        raise NotFoundError("Donation not found.")
    donation.status = data.status
    if data.quantity_received is not None:
        donation.quantity_received = data.quantity_received
    donation.status_changed_by_user_id = actor_id
    donation.status_changed_at = datetime.now(UTC)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="donation.status_change",
        entity_type="donation",
        entity_id=donation.id,
        changes={"status": data.status},
    )
    await session.commit()
