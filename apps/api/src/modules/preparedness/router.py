"""HTTP surface for the preparedness module (FR-PRP-*).

Thin by rule: routers validate, delegate to `service.py`, and serialise. They
never touch the database and never contain business logic (AGENTS.md Section 5).
Authorization is applied here as a router dependency, from `core/deps.py`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from src.core.deps import CurrentUser, require_role
from src.core.errors import NotFoundError
from src.core.pagination import Page
from src.db.session import DbSessionDep
from src.modules.preparedness import service
from src.modules.preparedness.schemas import (
    FaqIn,
    GuideIn,
    PublicFaq,
    PublicGuide,
    PublicGuideSummary,
)

public_router = APIRouter(tags=["preparedness"])
admin_router = APIRouter(tags=["preparedness"])


# --- public --------------------------------------------------------------------


@public_router.get("/guides", summary="Preparedness guide cards")
async def public_guides(
    session: DbSessionDep, page: int = 1, size: int = 20
) -> Page[PublicGuideSummary]:
    return await service.list_guides(session, page=page, size=size)


@public_router.get("/guides/{slug}", summary="The full guide article")
async def public_guide(slug: str, session: DbSessionDep) -> PublicGuide:
    guide = await service.get_guide(session, slug)
    if guide is None:
        raise NotFoundError("Guide not found.")
    return guide


@public_router.get("/faqs", summary="Frequently asked questions")
async def public_faqs(session: DbSessionDep) -> list[PublicFaq]:
    return await service.list_faqs(session)


# --- admin ----------------------------------------------------------------------


@admin_router.get(
    "/guides", dependencies=[Depends(require_role("admin"))], summary="List all guides"
)
async def admin_list_guides(session: DbSessionDep) -> list[PublicGuide]:
    return await service.list_guides_admin(session)


@admin_router.post(
    "/guides", dependencies=[Depends(require_role("admin"))], summary="Create a guide"
)
async def admin_create_guide(
    body: GuideIn, session: DbSessionDep, user: CurrentUser
) -> PublicGuide:
    guide = await service.create_guide(session, body, actor_id=user.id)
    return await service.get_guide(session, guide.slug) or await _admin_get(session, guide.id)


async def _admin_get(session: DbSessionDep, guide_id: uuid.UUID) -> PublicGuide:
    items = await service.list_guides_admin(session)
    return next(g for g in items if g.id == guide_id)


@admin_router.patch(
    "/guides/{guide_id}", dependencies=[Depends(require_role("admin"))], summary="Update a guide"
)
async def admin_update_guide(
    guide_id: uuid.UUID, body: GuideIn, session: DbSessionDep, user: CurrentUser
) -> PublicGuide:
    await service.update_guide(session, guide_id, body, actor_id=user.id)
    return await _admin_get(session, guide_id)


@admin_router.delete(
    "/guides/{guide_id}", dependencies=[Depends(require_role("admin"))], summary="Remove a guide"
)
async def admin_delete_guide(
    guide_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_guide(session, guide_id, actor_id=user.id)
    return {"ok": True}


@admin_router.get("/faqs", dependencies=[Depends(require_role("admin"))], summary="List all FAQs")
async def admin_list_faqs(session: DbSessionDep) -> list[PublicFaq]:
    return await service.list_faqs(session, published_only=False)


@admin_router.post("/faqs", dependencies=[Depends(require_role("admin"))], summary="Create a FAQ")
async def admin_create_faq(body: FaqIn, session: DbSessionDep, user: CurrentUser) -> PublicFaq:
    faq = await service.create_faq(session, body, actor_id=user.id)
    items = await service.list_faqs(session, published_only=False)
    return next(f for f in items if f.id == faq.id)


@admin_router.patch(
    "/faqs/{faq_id}", dependencies=[Depends(require_role("admin"))], summary="Update a FAQ"
)
async def admin_update_faq(
    faq_id: uuid.UUID, body: FaqIn, session: DbSessionDep, user: CurrentUser
) -> PublicFaq:
    await service.update_faq(session, faq_id, body, actor_id=user.id)
    items = await service.list_faqs(session, published_only=False)
    return next(f for f in items if f.id == faq_id)


@admin_router.delete(
    "/faqs/{faq_id}", dependencies=[Depends(require_role("admin"))], summary="Remove a FAQ"
)
async def admin_delete_faq(
    faq_id: uuid.UUID, session: DbSessionDep, user: CurrentUser
) -> dict[str, bool]:
    await service.delete_faq(session, faq_id, actor_id=user.id)
    return {"ok": True}
