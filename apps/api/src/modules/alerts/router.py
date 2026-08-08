"""HTTP surface for the alerts module (FR-ALT-*).

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
from src.modules.alerts import service
from src.modules.alerts.schemas import AlertPromptOut, AnnouncementIn, PublicAnnouncement

public_router = APIRouter(tags=["alerts"])
admin_router = APIRouter(tags=["alerts"])


# --- public --------------------------------------------------------------------


@public_router.get("/announcements", summary="Announcements & alerts, newest first")
async def public_announcements(
    session: DbSessionDep, page: int = 1, size: int = 20, kind: str | None = None
) -> Page[PublicAnnouncement]:
    return await service.list_announcements(session, page=page, size=size, kind=kind)


@public_router.get(
    "/announcements/active",
    summary="The alert that takes over the top of the page, or null (FR-PUB-017)",
)
async def public_active_alert(session: DbSessionDep) -> PublicAnnouncement | None:
    return await service.get_active_alert(session)


# --- admin ----------------------------------------------------------------------


@admin_router.get(
    "/announcements",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="List all announcements",
)
async def admin_list_announcements(session: DbSessionDep) -> list[PublicAnnouncement]:
    return await service.list_announcements_admin(session)


@admin_router.post(
    "/announcements",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="Publish an announcement or alert",
)
async def admin_create_announcement(
    body: AnnouncementIn, session: DbSessionDep, user: CurrentUser
) -> PublicAnnouncement:
    return await service.create_announcement(session, body, actor_id=user.id)


@admin_router.delete(
    "/announcements/{announcement_id}",
    dependencies=[Depends(require_role("admin", "sk"))],
    summary="Deactivate an alert (FR-ALT-011) — never a delete",
)
async def admin_deactivate_announcement(
    announcement_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.deactivate_announcement(session, announcement_id, actor_id=user.id)
    return {"ok": True}


@admin_router.get(
    "/alert-prompts",
    dependencies=[Depends(require_role("admin"))],
    summary="Threshold breaches awaiting a decision (FR-WX-009)",
)
async def admin_list_alert_prompts(
    session: DbSessionDep, unresolved_only: bool = True
) -> list[AlertPromptOut]:
    return await service.list_alert_prompts(session, unresolved_only=unresolved_only)


@admin_router.post(
    "/alert-prompts/{prompt_id}/acknowledge",
    dependencies=[Depends(require_role("admin"))],
    summary="Acknowledge a threshold breach — publishing an alert is a separate, explicit act",
)
async def admin_acknowledge_alert_prompt(
    prompt_id: uuid.UUID,
    session: DbSessionDep,
    user: CurrentUser,
    resulted_in_announcement_id: uuid.UUID | None = None,
) -> dict[str, bool]:
    await service.acknowledge_alert_prompt(
        session,
        prompt_id,
        actor_id=user.id,
        resulted_in_announcement_id=resulted_in_announcement_id,
    )
    return {"ok": True}
