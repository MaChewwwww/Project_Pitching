"""Business logic and transaction boundaries for the registry module (FR-REG-*).

Services own the transaction and may query their own module's models. A service
never imports another module's `models.py` — cross-module access goes through
the owning service (AGENTS.md Section 5).

**Scope note.** Only the read-side aggregate functions used by `analytics`
(FR-ANL-002/003) live here in this pass. Registration, members, nutrition, and
vulnerability are out of scope — see `models.py`'s module docstring.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.registry.models import Household, Member


async def counts_by_area(session: AsyncSession) -> dict[uuid.UUID, tuple[int, int]]:
    """`{area_id: (household_count, member_count)}` — derived, never stored
    (NFR-DAT-005). Registered counts are always `COUNT(*)` at query time."""
    household_rows = (
        await session.execute(
            select(Household.area_id, func.count(Household.id))
            .where(Household.deleted_at.is_(None))
            .group_by(Household.area_id)
        )
    ).all()
    household_by_area = dict(household_rows)

    member_rows = (
        await session.execute(
            select(Household.area_id, func.count(Member.id))
            .join(Member, Member.household_id == Household.id)
            .where(Household.deleted_at.is_(None), Member.deleted_at.is_(None))
            .group_by(Household.area_id)
        )
    ).all()
    member_by_area = dict(member_rows)

    area_ids = set(household_by_area) | set(member_by_area)
    return {aid: (household_by_area.get(aid, 0), member_by_area.get(aid, 0)) for aid in area_ids}


async def total_counts(session: AsyncSession) -> tuple[int, int]:
    households = (
        await session.execute(
            select(func.count(Household.id)).where(Household.deleted_at.is_(None))
        )
    ).scalar_one()
    members = (
        await session.execute(
            select(func.count(Member.id))
            .join(Household, Member.household_id == Household.id)
            .where(Member.deleted_at.is_(None), Household.deleted_at.is_(None))
        )
    ).scalar_one()
    return households, members
