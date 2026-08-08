"""Business logic and transaction boundaries for the alerts module (FR-ALT-*).

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
from src.modules.alerts.models import AlertPrompt, Announcement, AnnouncementArea
from src.modules.alerts.schemas import AlertPromptOut, AnnouncementIn, PublicAnnouncement
from src.modules.geo.models import Area
from src.modules.users.models import User


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


def _is_active(a: Announcement, *, now: datetime) -> bool:
    return (
        a.published_at is not None
        and a.deactivated_at is None
        and (a.expires_at is None or a.expires_at > now)
    )


async def _to_public(
    session: AsyncSession, rows: list[tuple[Announcement, str]]
) -> list[PublicAnnouncement]:
    now = datetime.now(UTC)
    area_names = await _area_names_by_announcement(session, [a.id for a, _ in rows])
    return [
        PublicAnnouncement(
            id=a.id,
            kind=a.kind,
            type=a.type,
            severity=a.severity,
            alert_level=a.alert_level,
            title=a.title,
            body=a.body,
            instruction=a.instruction,
            is_barangay_wide=a.is_barangay_wide,
            published_at=a.published_at,
            expires_at=a.expires_at,
            deactivated_at=a.deactivated_at,
            area_names=area_names.get(a.id, []),
            issued_by_name=issuer_name,
            is_active=_is_active(a, now=now),
        )
        for a, issuer_name in rows
    ]


async def list_announcements(
    session: AsyncSession, *, page: int = 1, size: int = 20, kind: str | None = None
) -> Page[PublicAnnouncement]:
    stmt = (
        select(Announcement, User.full_name)
        .join(User, Announcement.issued_by_user_id == User.id)
        .where(Announcement.published_at.is_not(None))
        .order_by(Announcement.published_at.desc())
    )
    if kind:
        stmt = stmt.where(Announcement.kind == kind)

    total = len((await session.execute(stmt)).all())
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).all()
    items = await _to_public(session, rows)
    return Page[PublicAnnouncement](items=items, **page_meta(total, page, size))


async def get_active_alert(session: AsyncSession) -> PublicAnnouncement | None:
    now = datetime.now(UTC)
    stmt = (
        select(Announcement, User.full_name)
        .join(User, Announcement.issued_by_user_id == User.id)
        .where(
            Announcement.kind == "alert",
            Announcement.published_at.is_not(None),
            Announcement.deactivated_at.is_(None),
        )
        .order_by(Announcement.published_at.desc())
    )
    rows = (await session.execute(stmt)).all()
    active = [(a, name) for a, name in rows if a.expires_at is None or a.expires_at > now]
    if not active:
        return None
    return (await _to_public(session, active[:1]))[0]


async def create_announcement(
    session: AsyncSession, data: AnnouncementIn, *, actor_id: uuid.UUID
) -> PublicAnnouncement:
    """Publishing an alert/announcement is a deliberate, human, named-officer act
    (D-4, A-10). Nothing else in this system writes to this table."""
    announcement = Announcement(
        kind=data.kind,
        type=data.type,
        severity=data.severity,
        alert_level=data.alert_level,
        title=data.title,
        body=data.body,
        instruction=data.instruction,
        is_barangay_wide=data.is_barangay_wide,
        published_at=datetime.now(UTC) if data.publish_now else None,
        expires_at=data.expires_at,
        issued_by_user_id=actor_id,
    )
    session.add(announcement)
    await session.flush()

    for area_id in data.area_ids:
        session.add(AnnouncementArea(announcement_id=announcement.id, area_id=area_id))

    await write_audit(
        session,
        actor_user_id=actor_id,
        action="announcement.publish" if data.publish_now else "announcement.draft",
        entity_type="announcement",
        entity_id=announcement.id,
        changes={"kind": data.kind, "type": data.type, "title": data.title},
    )
    await session.commit()

    user = await session.get(User, actor_id)
    return (await _to_public(session, [(announcement, user.full_name)]))[0]


async def deactivate_announcement(
    session: AsyncSession, announcement_id: uuid.UUID, *, actor_id: uuid.UUID
) -> None:
    """FR-ALT-011. Sets `deactivated_at` — never a delete; history stays."""
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
    stmt = (
        select(Announcement, User.full_name)
        .join(User, Announcement.issued_by_user_id == User.id)
        .order_by(Announcement.created_at.desc())
    )
    rows = (await session.execute(stmt)).all()
    return await _to_public(session, rows)


# --- alert prompts (FR-WX-009) -------------------------------------------------


async def list_alert_prompts(
    session: AsyncSession, *, unresolved_only: bool = True
) -> list[AlertPromptOut]:
    stmt = select(AlertPrompt).order_by(AlertPrompt.created_at.desc())
    if unresolved_only:
        stmt = stmt.where(AlertPrompt.acknowledged_at.is_(None))
    rows = (await session.execute(stmt)).scalars().all()
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
        for p in rows
    ]


async def create_alert_prompt_if_new(
    session: AsyncSession, *, reading_id: int, level: int, threshold_value: float
) -> AlertPrompt | None:
    """Insert an `alert_prompt` for `reading_id`, unless one already exists.

    Same idempotency rule `services/cron/jobs/readings.py`'s `evaluate_thresholds`
    enforces via raw SQL — at most one prompt per reading. This ORM copy exists
    because `weather.service.simulate_typhoon` needs the prompt to appear
    synchronously (within the same request a presenter just triggered), not on
    cron's next scheduled tick up to `SCRAPE_INTERVAL_MINUTES` later. Small,
    deliberate duplication between two languages/containers that cannot share a
    Python import (architecture.md Section 8.1 already accepts this trade for
    the adapters; this is the same trade for the five lines of eval logic).
    """
    existing = (
        await session.execute(select(AlertPrompt).where(AlertPrompt.reading_id == reading_id))
    ).scalar_one_or_none()
    if existing is not None:
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
    """`resulted_in_announcement_id` staying null is a legitimate, recorded
    outcome — the officer looked and decided not to warn (D-4)."""
    prompt = await session.get(AlertPrompt, prompt_id)
    if prompt is None:
        raise NotFoundError("Alert prompt not found.")
    prompt.acknowledged_by_user_id = actor_id
    prompt.acknowledged_at = datetime.now(UTC)
    prompt.resulted_in_announcement_id = resulted_in_announcement_id
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="alert_prompt.acknowledge",
        entity_type="alert_prompt",
        entity_id=prompt.id,
        changes={
            "resulted_in_announcement_id": str(resulted_in_announcement_id)
            if resulted_in_announcement_id
            else None
        },
    )
    await session.commit()
