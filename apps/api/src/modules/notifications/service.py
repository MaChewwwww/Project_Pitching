from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError
from src.core.pagination import Page, page_meta
from src.modules.notifications.models import Notification
from src.modules.notifications.schemas import NotificationOut


def _out(row: Notification) -> NotificationOut:
    return NotificationOut(
        id=row.id,
        type=row.type,
        title=row.title,
        body=row.body,
        link_path=row.link_path,
        read_at=row.read_at,
        created_at=row.created_at,
    )


async def create_notification(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str,
    link_path: str | None,
    source_type: str | None = None,
    source_id: uuid.UUID | None = None,
) -> None:
    """Queue an idempotent in-app notice inside the caller's transaction."""
    if source_type is not None and source_id is not None:
        existing = await session.scalar(
            select(Notification.id).where(
                Notification.user_id == user_id,
                Notification.type == type,
                Notification.source_type == source_type,
                Notification.source_id == source_id,
            )
        )
        if existing is not None:
            return
    session.add(
        Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            link_path=link_path,
            source_type=source_type,
            source_id=source_id,
        )
    )


async def list_notifications(
    session: AsyncSession, *, user_id: uuid.UUID, page: int, size: int, unread_only: bool
) -> Page[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    total = (await session.scalar(select(func.count()).select_from(stmt.subquery()))) or 0
    rows = (
        (
            await session.execute(
                stmt.order_by(Notification.created_at.desc()).limit(size).offset((page - 1) * size)
            )
        )
        .scalars()
        .all()
    )
    return Page[NotificationOut](items=[_out(row) for row in rows], **page_meta(total, page, size))


async def unread_count(session: AsyncSession, *, user_id: uuid.UUID) -> int:
    return (
        await session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
    ) or 0


async def mark_read(
    session: AsyncSession, *, notification_id: uuid.UUID, user_id: uuid.UUID
) -> NotificationOut:
    row = await session.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
    )
    if row is None:
        raise NotFoundError("Notification not found.")
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(row)
    return _out(row)


async def mark_all_read(session: AsyncSession, *, user_id: uuid.UUID) -> None:
    await session.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    await session.commit()
