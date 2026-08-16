"""Business logic and transaction boundaries for the preparedness module (FR-PRP-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.audit import write_audit
from src.core.errors import NotFoundError
from src.core.pagination import Page, page_meta
from src.modules.preparedness.models import Faq, Guide
from src.modules.preparedness.schemas import (
    FaqIn,
    GuideIn,
    PublicFaq,
    PublicGuide,
    PublicGuideSummary,
    _excerpt,
)


def _summary(g: Guide) -> PublicGuideSummary:
    return PublicGuideSummary(
        id=g.id,
        slug=g.slug,
        hazard_type=g.hazard_type,
        title_fil=g.title_fil,
        title_en=g.title_en,
        phase=g.phase,
        source_attribution=g.source_attribution,
        last_reviewed_at=g.last_reviewed_at,
        sort_order=g.sort_order,
        excerpt_fil=_excerpt(g.body_fil),
        excerpt_en=_excerpt(g.body_en),
    )


async def list_guides(
    session: AsyncSession, *, page: int = 1, size: int = 20, published_only: bool = True
) -> Page[PublicGuideSummary]:
    stmt = select(Guide).order_by(Guide.sort_order)
    if published_only:
        stmt = stmt.where(Guide.is_published.is_(True))
    total = len((await session.execute(stmt)).all())
    rows = (await session.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    return Page[PublicGuideSummary](
        items=[_summary(g) for g in rows], **page_meta(total, page, size)
    )


async def get_guide(session: AsyncSession, slug: str) -> PublicGuide | None:
    guide = (await session.execute(select(Guide).where(Guide.slug == slug))).scalar_one_or_none()
    if guide is None or not guide.is_published:
        return None
    return PublicGuide(
        **_summary(guide).model_dump(), body_fil=guide.body_fil, body_en=guide.body_en
    )


async def list_guides_admin(session: AsyncSession) -> list[PublicGuide]:
    rows = (await session.execute(select(Guide).order_by(Guide.sort_order))).scalars().all()
    return [
        PublicGuide(**_summary(g).model_dump(), body_fil=g.body_fil, body_en=g.body_en)
        for g in rows
    ]


async def create_guide(session: AsyncSession, data: GuideIn, *, actor_id: uuid.UUID) -> Guide:
    guide = Guide(**data.model_dump())
    session.add(guide)
    await session.flush()
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="guide.create",
        entity_type="guide",
        entity_id=guide.id,
    )
    await session.commit()
    return guide


async def update_guide(
    session: AsyncSession, guide_id: uuid.UUID, data: GuideIn, *, actor_id: uuid.UUID
) -> Guide:
    guide = await session.get(Guide, guide_id)
    if guide is None:
        raise NotFoundError("Guide not found.")
    for key, value in data.model_dump().items():
        setattr(guide, key, value)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="guide.update",
        entity_type="guide",
        entity_id=guide.id,
    )
    await session.commit()
    return guide


async def delete_guide(session: AsyncSession, guide_id: uuid.UUID, *, actor_id: uuid.UUID) -> None:
    guide = await session.get(Guide, guide_id)
    if guide is None:
        raise NotFoundError("Guide not found.")
    await session.delete(guide)
    await write_audit(
        session,
        actor_user_id=actor_id,
        action="guide.delete",
        entity_type="guide",
        entity_id=guide_id,
    )
    await session.commit()


# --- faqs -----------------------------------------------------------------------


def _faq_public(f: Faq) -> PublicFaq:
    return PublicFaq(
        id=f.id,
        question_fil=f.question_fil,
        question_en=f.question_en,
        answer_fil=f.answer_fil,
        answer_en=f.answer_en,
        category=f.category or "general",
        sort_order=f.sort_order,
        is_published=f.is_published,
    )


async def list_faqs(session: AsyncSession, *, published_only: bool = True) -> list[PublicFaq]:
    stmt = select(Faq).order_by(Faq.sort_order)
    if published_only:
        stmt = stmt.where(Faq.is_published.is_(True))
    rows = (await session.execute(stmt)).scalars().all()
    return [_faq_public(f) for f in rows]


async def create_faq(session: AsyncSession, data: FaqIn, *, actor_id: uuid.UUID) -> Faq:
    faq = Faq(**data.model_dump())
    session.add(faq)
    await session.flush()
    await write_audit(
        session, actor_user_id=actor_id, action="faq.create", entity_type="faq", entity_id=faq.id
    )
    await session.commit()
    return faq


async def update_faq(
    session: AsyncSession, faq_id: uuid.UUID, data: FaqIn, *, actor_id: uuid.UUID
) -> Faq:
    faq = await session.get(Faq, faq_id)
    if faq is None:
        raise NotFoundError("FAQ not found.")
    for key, value in data.model_dump().items():
        setattr(faq, key, value)
    await write_audit(
        session, actor_user_id=actor_id, action="faq.update", entity_type="faq", entity_id=faq.id
    )
    await session.commit()
    return faq


async def delete_faq(session: AsyncSession, faq_id: uuid.UUID, *, actor_id: uuid.UUID) -> None:
    faq = await session.get(Faq, faq_id)
    if faq is None:
        raise NotFoundError("FAQ not found.")
    await session.delete(faq)
    await write_audit(
        session, actor_user_id=actor_id, action="faq.delete", entity_type="faq", entity_id=faq_id
    )
    await session.commit()
