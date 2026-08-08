"""Business logic and transaction boundaries for the activities module (FR-ACT-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import NotFoundError
from src.core.pagination import Page, page_meta
from src.modules.activities.models import Activity
from src.modules.activities.schemas import ActivityIn, PublicActivity
from src.modules.geo.models import Area


def _to_public(a: Activity, area_name: str | None, *, now: datetime) -> PublicActivity:
    return PublicActivity(
        id=a.id,
        title=a.title,
        type=a.type,
        description=a.description,
        starts_at=a.starts_at,
        ends_at=a.ends_at,
        venue=a.venue,
        area_id=a.area_id,
        area_name=area_name,
        is_upcoming=a.starts_at > now,
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
        stmt = stmt.where(Activity.is_published.is_(True))
    if upcoming:
        stmt = stmt.where(Activity.starts_at > now)
    stmt = stmt.order_by(Activity.starts_at)

    total = len((await session.execute(stmt)).all())
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).all()
    items = [_to_public(a, name, now=now) for a, name in rows]
    return Page[PublicActivity](items=items, **page_meta(total, page, size))


async def list_activities_admin(session: AsyncSession) -> list[PublicActivity]:
    now = datetime.now(UTC)
    rows = (
        await session.execute(
            select(Activity, Area.name)
            .outerjoin(Area, Activity.area_id == Area.id)
            .order_by(Activity.starts_at)
        )
    ).all()
    return [_to_public(a, name, now=now) for a, name in rows]


async def create_activity(
    session: AsyncSession, data: ActivityIn, *, actor_id: uuid.UUID
) -> Activity:
    activity = Activity(**data.model_dump(), created_by_user_id=actor_id)
    session.add(activity)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.create",
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
    for key, value in data.model_dump().items():
        setattr(activity, key, value)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.update",
        entity_type="activity",
        entity_id=activity.id,
    )
    await session.commit()
    return activity


async def delete_activity(
    session: AsyncSession, activity_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    activity = await session.get(Activity, activity_id)
    if activity is None:
        raise NotFoundError("Activity not found.")
    await session.delete(activity)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="activity.delete",
        entity_type="activity",
        entity_id=activity_id,
    )
    await session.commit()
